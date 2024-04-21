package com.meanmatheus.editpdf

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.RectF
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.os.ParcelFileDescriptor.MODE_READ_ONLY
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
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
    fun editPdf(caminho: String, quantidadeImg: Int, modo: String, promise: Promise) {
        processPdfOperation(caminho, promise) { fileSelected, document ->
            if (caminho.endsWith(".pdf")) {
                if (fileSelected != null) {
                    pageToImage(fileSelected).forEach { image ->
                        drawImageInPdf(modo, quantidadeImg, image, document)
                    }
                }
            } else {
                val image = BitmapFactory.decodeFile(fileSelected?.absolutePath)
                drawImageInPdf(modo, quantidadeImg, image, document)
            }

        }
    }

    private inline fun processPdfOperation(
        caminho: String,
        promise: Promise,
        crossinline block: (File?, PDDocument) -> Unit
    ) {
        Thread {
            try {
                val fileSelected = FileUtils().getFile(caminho, reactApplicationContext)
                val document = PDDocument()
                block(fileSelected, document)

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
        val pageWidth = if (modo.contains("Retrato")) {
            PDRectangle.A4.width
        } else {
            PDRectangle.A4.height
        }
        val pageHeight = if (modo.contains("Retrato")) {
            PDRectangle.A4.height
        } else {
            PDRectangle.A4.width
        }
        val page = PDPage(PDRectangle(pageWidth, pageHeight))
        document.addPage(page)

        // Calculate number of rows and columns
        val cols = ceil(sqrt(quantidadeImg.toDouble())).toInt()
        val rows = ceil(quantidadeImg.toDouble() / cols).toInt()

        // Calculate maximum image size with margins
        val margin = 10 // Adjust margin size as needed (in pixels)
        val maxWidth = ((pageWidth - 2 * margin) / cols).toInt()
        val maxHeight = ((pageHeight - 2 * margin) / rows).toInt() // Adjust for rows

        // Calculate scaling factor
        val scaleX = 1f.coerceAtMost(maxWidth.toFloat() / image.width.toFloat())
        val scaleY = 1f.coerceAtMost(maxHeight.toFloat() / image.height.toFloat())
        val scale = scaleX.coerceAtMost(scaleY) // Use the smaller scaling factor

        val newImageWidth = (image.width * scale).toInt() - 10
        val newImageHeight = (image.height * scale).toInt() - 10

        // Create a ByteArrayOutputStream to hold the bitmap bytes
        val outputStream = ByteArrayOutputStream()

        // Compress the bitmap to a PNG format
        image.compress(Bitmap.CompressFormat.PNG, 100, outputStream)

        // Create a PDImageXObject from the compressed image bytes
        val pdImage =
            PDImageXObject.createFromByteArray(document, outputStream.toByteArray(), "image")

        // Get the content stream of the page
        val contentStream = PDPageContentStream(document, page)

        // Draw images onto the page
        var imageCount = 0
        for (row in 0 until rows) {
            for (col in 0 until cols) {
                if (imageCount >= quantidadeImg) {
                    break
                }

                val tempCol = if (modo.contains("Retrato")) {
                    row
                } else {
                    col
                }
                val tempRow = if (modo.contains("Retrato")) {
                    col
                } else {
                    row
                }

                val startX = tempCol * (newImageWidth + margin) + margin
                val startY = tempRow * (newImageHeight + margin) + margin
                val destinationRect = RectF(
                    startX.toFloat(),
                    startY.toFloat(),
                    (startX + newImageWidth).toFloat(),
                    (startY + newImageHeight).toFloat()
                )
                contentStream.drawImage(
                    pdImage,
                    destinationRect.left,
                    destinationRect.top,
                    destinationRect.width(),
                    destinationRect.height()
                )
                imageCount++
            }
        }
        contentStream.close()
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
