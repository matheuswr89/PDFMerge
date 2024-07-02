package com.meanmatheus.editpdf

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.os.ParcelFileDescriptor.MODE_READ_ONLY
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.pdmodel.PDPage
import com.tom_roush.pdfbox.pdmodel.PDPageContentStream
import com.tom_roush.pdfbox.pdmodel.common.PDRectangle
import com.tom_roush.pdfbox.pdmodel.graphics.image.PDImageXObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import kotlin.math.ceil
import kotlin.math.sqrt


class PdfModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val file = File(reactApplicationContext.cacheDir, "image_grid.pdf")

    override fun getName(): String {
        return "PdfModule"
    }

    @ReactMethod
    fun editPdf(caminho: ReadableArray, quantidadeImg: Int, modo: String, promise: Promise) {
        processPdfOperation(caminho.toArrayList(), promise) { fileSelected, document ->
            if (fileSelected != null) {
                if (fileSelected.name.endsWith(".pdf")) {
                        pageToImage(fileSelected).forEach { image ->
                            drawImageInPdf(modo, quantidadeImg, image, document)
                    }
                } else {
                    val image = BitmapFactory.decodeFile(fileSelected.absolutePath)
                    drawImageInPdf(modo, quantidadeImg, image, document)
                }
            }

        }
    }

    private inline fun processPdfOperation(
        caminho: java.util.ArrayList<Any>,
        promise: Promise,
        crossinline block: (File?, PDDocument) -> Unit
    ) {
        Thread {
            try {
                val document = PDDocument()
                caminho.forEach { cam ->
                    val fileSelected = FileUtils().getFile(cam as String, reactApplicationContext)
                    block(fileSelected, document)
                };
                FileOutputStream(file).use { out ->
                    document.save(out)
                    out.flush()
                }
                readAndSendBase64(promise)
            } catch (e: Throwable) {
                e.printStackTrace()
                promise.resolve("ERROR")
            } finally {
                FileUtils().deleteFiles(reactApplicationContext)
            }
        }.start()
    }

    private fun readAndSendBase64(promise: Promise) {
        val inputStream = FileInputStream(file)
        val bytes = ByteArray(file.length().toInt())
        inputStream.read(bytes)
        inputStream.close()
        promise.resolve(Base64.encodeToString(bytes, Base64.DEFAULT))
    }

    private fun drawImageInPdf(modo: String, quantidadeImg: Int, image: Bitmap, document: PDDocument) {
        // Define o tamanho da página com base no modo (Retrato ou Paisagem)
        val (pageWidth, pageHeight) = if (modo.contains("Retrato")) {
            PDRectangle.A4.width to PDRectangle.A4.height
        } else {
            PDRectangle.A4.height to PDRectangle.A4.width
        }
        val page = PDPage(PDRectangle(pageWidth, pageHeight))
        document.addPage(page)

        // Calcula o número de linhas e colunas
        val cols = ceil(sqrt(quantidadeImg.toDouble())).toInt()
        val rows = ceil(quantidadeImg.toDouble() / cols).toInt()

        // Define o tamanho máximo da imagem com margens
        val margin = 10 // Ajuste o tamanho da margem conforme necessário (em pixels)
        val maxWidth = ((pageWidth - 2 * margin) / cols).toInt()
        val maxHeight = ((pageHeight - 2 * margin) / rows).toInt()

        // Calcula o fator de escala
        val scale = minOf(
            maxWidth.toFloat() / image.width.toFloat(),
            maxHeight.toFloat() / image.height.toFloat(),
            1f
        )

        // Novo tamanho da imagem
        val newImageWidth = (image.width * scale).toInt() - margin
        val newImageHeight = (image.height * scale).toInt() - margin

        // Cria um ByteArrayOutputStream para armazenar os bytes do bitmap
        val outputStream = ByteArrayOutputStream()

        // Comprimi o bitmap no formato PNG
        image.compress(Bitmap.CompressFormat.PNG, 100, outputStream)

        // Cria um PDImageXObject a partir dos bytes da imagem comprimida
        val pdImage = PDImageXObject.createFromByteArray(document, outputStream.toByteArray(), "image")

        // Obtém o content stream da página
        PDPageContentStream(document, page).use { contentStream ->
            // Desenha as imagens na página
            var imageCount = 0
            for (row in 0 until rows) {
                for (col in 0 until cols) {
                    if (imageCount >= quantidadeImg) {
                        break
                    }

                    val (tempCol, tempRow) = if (modo.contains("Retrato")) {
                        col to row
                    } else {
                        row to col
                    }

                    val startX = tempCol * (newImageWidth + margin) + margin
                    val startY = tempRow * (newImageHeight + margin) + margin
                    contentStream.drawImage(
                        pdImage,
                        startX.toFloat(),
                        pageHeight - startY - newImageHeight.toFloat(),
                        newImageWidth.toFloat(),
                        newImageHeight.toFloat()
                    )
                    imageCount++
                }
            }
        }
    }

    private fun pageToImage(pdfFile: File): MutableList<Bitmap> {
        val fileDescriptor = ParcelFileDescriptor.open(pdfFile, MODE_READ_ONLY)
        val renderer = PdfRenderer(fileDescriptor)
        val pageCount = renderer.pageCount
        val listImages: MutableList<Bitmap> = ArrayList()

        for (i in 0 until pageCount) {
            val page = renderer.openPage(i)
            val bitmap = Bitmap.createBitmap(page.width, page.height, Bitmap.Config.ARGB_8888)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            listImages.add(bitmap)
            page.close()
        }

        renderer.close()
        return listImages
    }
}
