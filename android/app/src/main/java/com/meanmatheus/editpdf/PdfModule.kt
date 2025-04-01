package com.meanmatheus.editpdf

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.os.ParcelFileDescriptor.MODE_READ_ONLY
import android.util.Base64
import android.util.Log
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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import kotlin.math.ceil
import kotlin.math.min
import kotlin.math.sqrt

class PdfModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val TAG = "PdfModule"
    private val fileUtils = FileUtils()
    private val ioScope = CoroutineScope(Dispatchers.IO)

    // Tipos de orientação de página
    enum class PageOrientation {
        PORTRAIT, LANDSCAPE
    }

    override fun getName(): String {
        return "PdfModule"
    }

    @ReactMethod
    fun editPdf(paths: ReadableArray, imagesPerPage: Int, orientationMode: String, promise: Promise) {
        ioScope.launch {
            try {
                val outputFile = File(reactApplicationContext.cacheDir, "image_grid.pdf")
                val pathsList = paths.toArrayList().map { it as String }
                val orientation = if (orientationMode.contains("Retrato"))
                    PageOrientation.PORTRAIT else PageOrientation.LANDSCAPE

                val document = createPdfWithImages(pathsList, imagesPerPage, orientation)
                saveAndReturnDocument(document, outputFile, promise)
            } catch (e: Exception) {
                Log.e(TAG, "Error processing PDF", e)
                withContext(Dispatchers.Main) {
                    promise.reject("PDF_PROCESSING_ERROR", "Failed to process PDF: ${e.message}", e)
                }
            } finally {
                fileUtils.deleteFiles(reactApplicationContext)
            }
        }
    }

    private suspend fun createPdfWithImages(
        paths: List<String>,
        imagesPerPage: Int,
        orientation: PageOrientation
    ): PDDocument = withContext(Dispatchers.IO) {
        val document = PDDocument()

        // Processar arquivos em lotes para evitar problemas de memória
        val batchSize = 2 // Processar 2 arquivos por vez

        paths.chunked(batchSize).forEach { batchPaths ->
            batchPaths.forEach { path ->
                val file = fileUtils.getFile(path, reactApplicationContext)
                file?.let {
                    if (it.name.endsWith(".pdf", ignoreCase = true)) {
                        // Process PDF file com otimizações para arquivos grandes
                        try {
                            processPdfFile(it, document, imagesPerPage, orientation)
                        } catch (e: Exception) {
                            Log.e(TAG, "Error processing PDF file: ${it.absolutePath}", e)
                        }
                    } else {
                        // Process image file
                        try {
                            // Configurar opções de decodificação para reduzir uso de memória
                            val options = BitmapFactory.Options().apply {
                                inJustDecodeBounds = true
                            }
                            BitmapFactory.decodeFile(it.absolutePath, options)

                            // Calcular fator de amostragem para reduzir tamanho
                            val sampleSize = calculateInSampleSize(options, 1500, 1500) // limite máximo 1500x1500

                            options.apply {
                                inJustDecodeBounds = false
                                inSampleSize = sampleSize
                                inPreferredConfig = Bitmap.Config.RGB_565 // Usa menos memória que ARGB_8888
                            }

                            val image = BitmapFactory.decodeFile(it.absolutePath, options)
                            addImageToDocument(image, document, imagesPerPage, orientation)
                            // Reciclar bitmap após uso
                            image.recycle()
                        } catch (e: Exception) {
                            Log.e(TAG, "Error decoding image: ${it.absolutePath}", e)
                        }
                    }
                } ?: Log.w(TAG, "Unable to resolve file path: $path")
            }

            // Forçar garbage collection após cada lote
            System.gc()
        }

        document
    }

    // Modifique o método processPdfFile para usar ARGB_8888 ao invés de RGB_565
    private suspend fun processPdfFile(
        pdfFile: File,
        outputDocument: PDDocument,
        imagesPerPage: Int,
        orientation: PageOrientation
    ) = withContext(Dispatchers.IO) {
        try {
            ParcelFileDescriptor.open(pdfFile, MODE_READ_ONLY).use { fileDescriptor ->
                PdfRenderer(fileDescriptor).use { renderer ->
                    // Verifica se o PDF tem muitas páginas
                    val pageCount = renderer.pageCount
                    val isLargePdf = pageCount > 20

                    // Processa páginas em lotes para PDFs grandes
                    val pageBatchSize = if (isLargePdf) 5 else 10

                    for (batchStart in 0 until pageCount step pageBatchSize) {
                        val batchEnd = min(batchStart + pageBatchSize, pageCount)
                        val pageBitmaps = mutableListOf<Bitmap>()

                        // Renderiza um lote de páginas
                        for (i in batchStart until batchEnd) {
                            renderer.openPage(i).use { page ->
                                // Determinar a resolução adequada
                                val maxDimension = 1500 // Limitar a dimensão máxima
                                val scale = min(
                                    maxDimension.toFloat() / page.width,
                                    maxDimension.toFloat() / page.height
                                )

                                val width = (page.width * scale).toInt()
                                val height = (page.height * scale).toInt()

                                // Use ARGB_8888 em vez de RGB_565 para evitar erros de formato de pixel
                                val bitmap = Bitmap.createBitmap(
                                    width,
                                    height,
                                    Bitmap.Config.ARGB_8888 // Alterado de RGB_565 para ARGB_8888
                                )

                                // Configurar matriz de transformação para escala
                                val matrix = android.graphics.Matrix()
                                matrix.setScale(scale, scale)

                                page.render(
                                    bitmap,
                                    null,
                                    matrix,
                                    PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY
                                )

                                pageBitmaps.add(bitmap)
                            }
                        }

                        // Adiciona as páginas renderizadas ao documento
                        pageBitmaps.forEach { bitmap ->
                            addImageToDocument(bitmap, outputDocument, imagesPerPage, orientation)
                            bitmap.recycle() // Libera memória imediatamente
                        }

                        // Força GC após cada lote de páginas
                        System.gc()
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing PDF file", e)
            // Tenta processar o PDF com PDFBox como alternativa
            tryProcessWithPdfBox(pdfFile, outputDocument, imagesPerPage, orientation)
        }
    }

    // Também modifique renderPdfPageToImage para usar ARGB_8888
    private fun renderPdfPageToImage(pdfFile: File): Bitmap? {
        try {
            ParcelFileDescriptor.open(pdfFile, MODE_READ_ONLY).use { fileDescriptor ->
                PdfRenderer(fileDescriptor).use { renderer ->
                    if (renderer.pageCount > 0) {
                        renderer.openPage(0).use { page ->
                            // Determinar a resolução adequada
                            val maxDimension = 1500
                            val scale = min(
                                maxDimension.toFloat() / page.width,
                                maxDimension.toFloat() / page.height
                            )

                            val width = (page.width * scale).toInt()
                            val height = (page.height * scale).toInt()

                            // Use ARGB_8888 em vez de RGB_565
                            val bitmap = Bitmap.createBitmap(
                                width,
                                height,
                                Bitmap.Config.ARGB_8888 // Alterado de RGB_565 para ARGB_8888
                            )

                            // Configurar matriz de transformação para escala
                            val matrix = android.graphics.Matrix()
                            matrix.setScale(scale, scale)

                            page.render(
                                bitmap,
                                null,
                                matrix,
                                PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY
                            )

                            return bitmap
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error rendering PDF page to image", e)
        }

        return null
    }

    /**
     * Tenta processar o PDF com PDFBox se o PdfRenderer falhar
     */
    private fun tryProcessWithPdfBox(
        pdfFile: File,
        outputDocument: PDDocument,
        imagesPerPage: Int,
        orientation: PageOrientation
    ) {
        try {
            // Carregar o PDF usando PDFBox
            PDDocument.load(pdfFile).use { sourceDoc ->
                val pageCount = sourceDoc.numberOfPages

                // Processar em lotes para PDFs grandes
                val batchSize = 5
                for (i in 0 until pageCount step batchSize) {
                    val endIdx = min(i + batchSize, pageCount)

                    for (pageIndex in i until endIdx) {
                        try {
                            // Criar um novo documento apenas com essa página
                            val singlePageDoc = PDDocument()
                            val importedPage = singlePageDoc.importPage(sourceDoc.getPage(pageIndex))

                            // Salvar temporariamente
                            val tempFile = File(reactApplicationContext.cacheDir, "temp_page_$pageIndex.pdf")
                            singlePageDoc.save(tempFile)
                            singlePageDoc.close()

                            // Agora usar o PdfRenderer para renderizar esse PDF de uma página
                            val pageBitmap = renderPdfPageToImage(tempFile)

                            // Adicionar ao documento final
                            if (pageBitmap != null) {
                                addImageToDocument(pageBitmap, outputDocument, imagesPerPage, orientation)
                                pageBitmap.recycle()
                            }

                            // Limpar arquivo temporário
                            tempFile.delete()
                        } catch (e: Exception) {
                            Log.e(TAG, "Error processing page $pageIndex", e)
                        }
                    }

                    // Força GC após cada lote
                    System.gc()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to process PDF with PDFBox", e)
        }
    }

    // Função para calcular o fator de amostragem para reduzir o tamanho da imagem
    private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
        val (height, width) = options.outHeight to options.outWidth
        var inSampleSize = 1

        if (height > reqHeight || width > reqWidth) {
            val halfHeight = height / 2
            val halfWidth = width / 2

            while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                inSampleSize *= 2
            }
        }

        return inSampleSize
    }

    private fun createPDImageFromBitmap(bitmap: Bitmap, document: PDDocument): PDImageXObject {
        val outputStream = ByteArrayOutputStream()

        // Determinar o melhor formato de compressão baseado no tipo da imagem
        val hasTransparency = hasTransparency(bitmap)

        if (hasTransparency) {
            // Usar PNG para imagens com transparência
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
        } else {
            // Reduzir qualidade de compressão para imagens muito grandes
            val isLargeImage = bitmap.width * bitmap.height > 4_000_000 // >4MP
            val quality = when {
                bitmap.width * bitmap.height > 8_000_000 -> 70 // Imagens muito grandes (>8MP)
                isLargeImage -> 80 // Imagens grandes (4-8MP)
                else -> 90 // Imagens normais
            }

            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
        }

        return PDImageXObject.createFromByteArray(document, outputStream.toByteArray(), "image")
    }

    /**
     * Verifica se o bitmap contém pixels transparentes
     */
    private fun hasTransparency(bitmap: Bitmap): Boolean {
        // Para Bitmap.Config.RGB_565, não há transparência
        if (bitmap.config == Bitmap.Config.RGB_565) {
            return false
        }

        // Para bitmaps maiores, amostramos alguns pixels
        if (bitmap.width * bitmap.height > 1_000_000) { // >1MP
            val sampleSize = 20 // Amostra a cada 20 pixels
            for (x in 0 until bitmap.width step sampleSize) {
                for (y in 0 until bitmap.height step sampleSize) {
                    val pixel = bitmap.getPixel(x, y)
                    val alpha = (pixel shr 24) and 0xff
                    if (alpha < 255) {
                        return true
                    }
                }
            }
            return false
        }

        // Para bitmaps menores, verificamos todos os pixels
        for (x in 0 until bitmap.width) {
            for (y in 0 until bitmap.height) {
                val pixel = bitmap.getPixel(x, y)
                val alpha = (pixel shr 24) and 0xff
                if (alpha < 255) {
                    return true
                }
            }
        }

        return false
    }

    private fun convertPdfToImages(pdfFile: File): List<Bitmap> {
        val images = mutableListOf<Bitmap>()

        try {
            ParcelFileDescriptor.open(pdfFile, MODE_READ_ONLY).use { fileDescriptor ->
                PdfRenderer(fileDescriptor).use { renderer ->
                    for (i in 0 until renderer.pageCount) {
                        renderer.openPage(i).use { page ->
                            // Limitar o tamanho máximo da imagem para PDFs também
                            val scale = 2 // Fator de escala para qualidade adequada
                            val bitmap = Bitmap.createBitmap(
                                page.width * scale,
                                page.height * scale,
                                Bitmap.Config.RGB_565 // Usar formato que consome menos memória
                            )

                            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            images.add(bitmap)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error converting PDF to images", e)
        }

        return images
    }

    private fun addImageToDocument(
        image: Bitmap,
        document: PDDocument,
        imagesPerPage: Int,
        orientation: PageOrientation
    ) {
        Log.d(TAG, "Processing image: ${image.width}x${image.height}, format: ${image.config}")

        // Define page dimensions based on orientation
        val (pageWidth, pageHeight) = when (orientation) {
            PageOrientation.PORTRAIT -> PDRectangle.A4.width to PDRectangle.A4.height
            PageOrientation.LANDSCAPE -> PDRectangle.A4.height to PDRectangle.A4.width
        }

        val page = PDPage(PDRectangle(pageWidth, pageHeight))
        document.addPage(page)

        // Determinar a melhor configuração de grade com base na quantidade e na proporção da imagem
        val (rows, cols) = determineOptimalGrid(image, imagesPerPage, orientation, pageWidth, pageHeight)

        Log.d(TAG, "Optimal grid layout: $rows rows × $cols columns for ${orientation.name}")

        // Define margins and calculate available space
        val margin = 10f
        val availableWidth = pageWidth - (margin * 2)
        val availableHeight = pageHeight - (margin * 2)

        val cellWidth = availableWidth / cols
        val cellHeight = availableHeight / rows

        // Calculate image size with appropriate scaling
        val scale = min(
            (cellWidth - margin) / image.width,
            (cellHeight - margin) / image.height
        )

        val imageWidth = (image.width * scale).toFloat()
        val imageHeight = (image.height * scale).toFloat()

        Log.d(TAG, "Image scaling: scale=$scale, final size=${imageWidth}x${imageHeight}")

        // Convert bitmap to PDImageXObject
        val pdImage = createPDImageFromBitmap(image, document)

        try {
            PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true).use { contentStream ->
                // Draw images on page
                var imageCount = 0
                for (row in 0 until rows) {
                    for (col in 0 until cols) {
                        if (imageCount >= imagesPerPage) break

                        // Calculate image position within cell (centered)
                        val cellLeftX = margin + (col * cellWidth)
                        val cellTopY = pageHeight - margin - (row * cellHeight)

                        // Center image in cell
                        val imageX = cellLeftX + ((cellWidth - imageWidth) / 2)
                        val imageY = cellTopY - imageHeight - ((cellHeight - imageHeight) / 2)
                        Log.d(TAG, "Drawing image at position: ($imageX, $imageY)")

                        contentStream.drawImage(
                            pdImage,
                            imageX,
                            imageY,
                            imageWidth,
                            imageHeight
                        )

                        imageCount++
                    }
                }
            }
        } catch (e: IOException) {
            Log.e(TAG, "Error drawing image to PDF", e)
        }
    }

    /**
     * Determina a melhor configuração de grade (linhas × colunas) com base na quantidade de imagens,
     * nas dimensões da página e na proporção da imagem.
     */
    private fun determineOptimalGrid(
        image: Bitmap,
        imagesPerPage: Int,
        orientation: PageOrientation,
        pageWidth: Float,
        pageHeight: Float
    ): Pair<Int, Int> {
        // Calcular a proporção da imagem (largura / altura)
        val imageAspectRatio = image.width.toFloat() / image.height.toFloat()

        // Calcular a proporção da página
        val pageAspectRatio = pageWidth / pageHeight

        // Escolher a melhor configuração com base na quantidade e na proporção
        return when {
            // Para uma única imagem
            imagesPerPage == 1 -> 1 to 1

            // Para duas imagens
            imagesPerPage == 2 -> {
                // Se a imagem é mais larga que alta (paisagem)
                if (imageAspectRatio > 1.2) {
                    // Uma embaixo da outra para imagens largas
                    2 to 1
                } else if (imageAspectRatio < 0.8) {
                    // Uma ao lado da outra para imagens altas
                    1 to 2
                } else {
                    // Para proporções próximas do quadrado, depende da orientação da página
                    if (orientation == PageOrientation.PORTRAIT) 2 to 1 else 1 to 2
                }
            }

            // Para 3 ou 4 imagens
            imagesPerPage <= 4 -> {
                // Grid 2×2 é geralmente a melhor opção
                2 to 2
            }

            // Para 5 ou 6 imagens
            imagesPerPage <= 6 -> {
                // No modo retrato, preferimos mais linhas
                if (orientation == PageOrientation.PORTRAIT) {
                    3 to 2
                } else {
                    // No modo paisagem, preferimos mais colunas
                    2 to 3
                }
            }

            // Para até 9 imagens
            imagesPerPage <= 9 -> {
                // Grid 3×3
                3 to 3
            }

            // Para até 12 imagens
            imagesPerPage <= 12 -> {
                // No modo retrato, preferimos mais linhas
                if (orientation == PageOrientation.PORTRAIT) {
                    4 to 3
                } else {
                    // No modo paisagem, preferimos mais colunas
                    3 to 4
                }
            }

            // Para até 16 imagens
            imagesPerPage <= 16 -> {
                // Grid 4×4
                4 to 4
            }

            // Para quantidades maiores, calcula um grid equilibrado
            else -> {
                val gridSize = ceil(sqrt(imagesPerPage.toDouble())).toInt()

                // Ajuste baseado na orientação da página e proporção da imagem
                if (orientation == PageOrientation.PORTRAIT) {
                    if (imageAspectRatio > 1.2) {
                        // Para imagens largas em modo retrato, mais linhas que colunas
                        (gridSize + 1) to (gridSize - 1).coerceAtLeast(1)
                    } else {
                        gridSize to gridSize
                    }
                } else {
                    if (imageAspectRatio < 0.8) {
                        // Para imagens altas em modo paisagem, mais colunas que linhas
                        (gridSize - 1).coerceAtLeast(1) to (gridSize + 1)
                    } else {
                        gridSize to gridSize
                    }
                }
            }
        }
    }

    private suspend fun saveAndReturnDocument(
        document: PDDocument,
        outputFile: File,
        promise: Promise
    ) = withContext(Dispatchers.IO) {
        try {
            FileOutputStream(outputFile).use { out ->
                document.save(out)
                out.flush()
            }

            val base64String = FileInputStream(outputFile).use { input ->
                val bytes = ByteArray(outputFile.length().toInt())
                input.read(bytes)
                Base64.encodeToString(bytes, Base64.DEFAULT)
            }

            withContext(Dispatchers.Main) {
                promise.resolve(base64String)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error saving PDF document", e)
            withContext(Dispatchers.Main) {
                promise.reject("PDF_SAVE_ERROR", "Failed to save PDF: ${e.message}", e)
            }
        } finally {
            try {
                document.close()
            } catch (e: IOException) {
                Log.e(TAG, "Error closing PDF document", e)
            }
        }
    }
}