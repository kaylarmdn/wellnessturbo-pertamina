/**
 * ==============================================================================
 * WELLNESS TURBO - GOOGLE APPS SCRIPT BACKEND PROXY
 * ==============================================================================
 * Script ID: 1Vjxb5htMf2hCfjo0erwRFZjE5sye1HrnqH-Frgxf00BHxPu6bB82QVEY
 * Spreadsheet ID: 1oXQ8Y2fTiXTIeaJid00gmF3l75lg_2S1HCfAKB5TcMk
 * Drive Folder ID: 15RUMKWmvicR_yh95H4QsVenVPXqoa2IO
 * ==============================================================================
 */

const SPREADSHEET_ID = "1oXQ8Y2fTiXTIeaJid00gmF3l75lg_2S1HCfAKB5TcMk";
const DRIVE_FOLDER_ID = "15RUMKWmvicR_yh95H4QsVenVPXqoa2IO";

/**
 * Endpoint GET untuk membaca data dari tab Spreadsheet
 * Contoh URL: https://script.google.com/macros/s/DEPLOYMENT_ID/exec?action=read&sheet=Users
 */
function doGet(e) {
  try {
    const action = e ? e.parameter.action : null;
    const sheetName = e ? e.parameter.sheet : null;

    if (action === "read" && sheetName) {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        return responseJSON({ success: false, error: "Sheet tab '" + sheetName + "' tidak ditemukan." });
      }

      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return responseJSON({ success: true, data: [] });
      }

      const headers = data[0];
      const rows = data.slice(1).map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) {
          obj[h] = row[i];
        });
        return obj;
      });

      return responseJSON({ success: true, data: rows });
    }

    return responseJSON({ success: true, status: "Wellness Turbo Apps Script Backend is Active" });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

/**
 * Endpoint POST untuk Insert, Update, Delete & Upload File ke Google Drive
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, error: "Payload POST tidak ditemukan." });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    // --------------------------------------------------------------------------
    // 1. INSERT ROW
    // --------------------------------------------------------------------------
    if (action === "insert") {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      let sheet = ss.getSheetByName(payload.sheet);
      
      // Auto-create tab jika belum ada
      if (!sheet) {
        sheet = ss.insertSheet(payload.sheet);
        const sampleHeaders = Object.keys(payload.data || {});
        sheet.appendRow(sampleHeaders);
      }

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const newRow = headers.map(function(h) {
        return payload.data[h] !== undefined && payload.data[h] !== null ? payload.data[h] : "";
      });

      sheet.appendRow(newRow);
      return responseJSON({ success: true, data: payload.data });
    }

    // --------------------------------------------------------------------------
    // 2. UPSERT ROW (Update jika ID sama, Insert jika belum ada)
    // --------------------------------------------------------------------------
    if (action === "upsert") {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      let sheet = ss.getSheetByName(payload.sheet);
      if (!sheet) {
        sheet = ss.insertSheet(payload.sheet);
        sheet.appendRow(Object.keys(payload.data || {}));
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIndex = headers.indexOf("id");
      const record = payload.data;

      if (idIndex !== -1 && record.id) {
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][idIndex]) === String(record.id)) {
            // Update baris eksis
            const rowNum = i + 1;
            headers.forEach(function(h, colIdx) {
              if (record[h] !== undefined) {
                sheet.getRange(rowNum, colIdx + 1).setValue(record[h]);
              }
            });
            return responseJSON({ success: true, updated: true, data: record });
          }
        }
      }

      // Insert jika tidak ditemukan
      const newRow = headers.map(function(h) {
        return record[h] !== undefined && record[h] !== null ? record[h] : "";
      });
      sheet.appendRow(newRow);
      return responseJSON({ success: true, inserted: true, data: record });
    }

    // --------------------------------------------------------------------------
    // 3. DELETE ROW
    // --------------------------------------------------------------------------
    if (action === "delete") {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(payload.sheet);
      if (!sheet) return responseJSON({ success: false, error: "Sheet tidak ditemukan" });

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIndex = headers.indexOf("id");

      if (idIndex !== -1 && payload.id) {
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][idIndex]) === String(payload.id)) {
            sheet.deleteRow(i + 1);
            return responseJSON({ success: true, deleted: true, id: payload.id });
          }
        }
      }
      return responseJSON({ success: false, error: "ID tidak ditemukan untuk dihapus" });
    }

    // --------------------------------------------------------------------------
    // 4. UPLOAD FILE KE GOOGLE DRIVE
    // --------------------------------------------------------------------------
    if (action === "uploadFile") {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const decoded = Utilities.base64Decode(payload.base64Data);
      const blob = Utilities.newBlob(decoded, payload.mimeType || "image/png", payload.fileName || "upload.png");
      const file = folder.createFile(blob);
      
      // Set izin akses siapapun yang memiliki tautan (Public View)
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      const fileId = file.getId();
      const directUrl = "https://lh3.googleusercontent.com/d/" + fileId;
      
      return responseJSON({
        success: true,
        fileId: fileId,
        fileUrl: directUrl,
        downloadUrl: file.getDownloadUrl(),
      });
    }

    return responseJSON({ success: false, error: "Action '" + action + "' tidak dikenali." });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

/**
 * Format Response JSON dengan Header CORS
 */
function responseJSON(res) {
  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}
