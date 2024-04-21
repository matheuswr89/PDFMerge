package com.meanmatheus.editpdf

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import java.io.File

class FileUtils {

    fun getFile(caminho: String, context: ReactApplicationContext): File? {
        val directory = File(context.cacheDir, "DocumentPicker")
        val files = directory.listFiles() ?: return null
        val fileName = caminho.substringAfterLast('/')
        for (file in files) {
            if (file.name == fileName) {
                return file
            }
        }
        return null
    }

    fun deleteFiles(context: ReactApplicationContext) {
        val directory = File(context.cacheDir.absolutePath.toString() + "/DocumentPicker")
        val files = directory.listFiles()
        for (f in files!!) {
            f.delete()
        }
        val file = File(context.cacheDir, "image_grid.pdf")
        if (file.exists()) file.delete()
    }
}