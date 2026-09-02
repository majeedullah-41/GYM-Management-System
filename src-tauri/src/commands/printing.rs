use serde::Serialize;
use tauri::State;

use crate::database::Database;
use crate::dto::receipt::ReceiptResponse;
use crate::errors::AppError;
use crate::repositories::settings_repository::{self, PrintSettings};
use crate::services::printing_service;

#[derive(Serialize)]
pub struct PrintDispatchResult {
    pub mode: String,
    pub path: Option<String>,
    pub message: String,
}

/// Save arbitrary PDF bytes (sent from the frontend as base64) via the native
/// save dialog. The actual PDF is rendered on the frontend so it matches the UI.
#[tauri::command]
pub async fn save_pdf_bytes(
    payload: String,
    suggested_name: String,
) -> Result<PrintDispatchResult, AppError> {
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, payload)
        .map_err(|e| AppError::InternalError(format!("Invalid PDF payload: {e}")))?;

    match save_pdf_dialog_bytes(&bytes, &suggested_name) {
        PdfSaveResult::Saved(path) => Ok(PrintDispatchResult {
            mode: "pdf".to_string(),
            path: Some(path),
            message: "File saved as PDF".to_string(),
        }),
        PdfSaveResult::Cancelled => Ok(PrintDispatchResult {
            mode: "cancelled".to_string(),
            path: None,
            message: "Save cancelled".to_string(),
        }),
    }
}

fn save_pdf_dialog_bytes(bytes: &[u8], suggested_name: &str) -> PdfSaveResult {
    let file_name = sanitize(suggested_name);
    let path = rfd::FileDialog::new()
        .set_title("Save PDF")
        .set_file_name(&file_name)
        .add_filter("PDF", &["pdf"])
        .save_file();

    match path {
        Some(p) => {
            if std::fs::write(&p, bytes).is_ok() {
                PdfSaveResult::Saved(p.to_string_lossy().to_string())
            } else {
                PdfSaveResult::Cancelled
            }
        }
        None => PdfSaveResult::Cancelled,
    }
}

#[tauri::command]
pub async fn print_receipt_json(
    state: State<'_, Database>,
    receipt_json: String,
) -> Result<PrintDispatchResult, AppError> {
    let receipt: ReceiptResponse = serde_json::from_str(&receipt_json).map_err(|e| {
        AppError::InternalError(format!("Invalid receipt payload: {}", e))
    })?;

    let conn = state.inner().clone_conn();
    let (print, footer) = tauri::async_runtime::spawn_blocking(move || {
        let guard = conn.lock().unwrap_or_else(|e| e.into_inner());
        let print = settings_repository::get_print_settings(&guard)?;
        let footer = settings_repository::get_receipt_settings(&guard)?.receipt_footer;
        Ok::<(PrintSettings, Option<String>), AppError>((print, footer))
    })
    .await
    .map_err(|e| AppError::InternalError(format!("Print task failed: {e}")))??;

    let bytes =
        printing_service::render_receipt_pdf(&receipt, &print, footer.as_deref())?;

    if print.destination == "pdf" {
        match save_pdf_dialog(bytes, &receipt.receipt_number) {
            PdfSaveResult::Saved(path) => Ok(PrintDispatchResult {
                mode: "pdf".to_string(),
                path: Some(path),
                message: "Receipt saved as PDF".to_string(),
            }),
            PdfSaveResult::Cancelled => Ok(PrintDispatchResult {
                mode: "cancelled".to_string(),
                path: None,
                message: "Print cancelled".to_string(),
            }),
        }
    } else {
        open_in_viewer(bytes, &receipt.receipt_number)
    }
}

enum PdfSaveResult {
    Saved(String),
    Cancelled,
}

fn save_pdf_dialog(bytes: Vec<u8>, receipt_number: &str) -> PdfSaveResult {
    let file_name = format!("Receipt-{}.pdf", sanitize(receipt_number));
    let path = rfd::FileDialog::new()
        .set_title("Save Receipt as PDF")
        .set_file_name(&file_name)
        .add_filter("PDF", &["pdf"])
        .save_file();

    match path {
        Some(p) => {
            if std::fs::write(&p, bytes).is_ok() {
                PdfSaveResult::Saved(p.to_string_lossy().to_string())
            } else {
                PdfSaveResult::Cancelled
            }
        }
        None => PdfSaveResult::Cancelled,
    }
}

fn open_in_viewer(bytes: Vec<u8>, receipt_number: &str) -> Result<PrintDispatchResult, AppError> {
    let dir = std::env::temp_dir().join("gympos_print");
    std::fs::create_dir_all(&dir).map_err(|e| {
        AppError::InternalError(format!("Failed to create print temp dir: {e}"))
    })?;

    let ts = chrono::Utc::now().format("%Y%m%d-%H%M%S");
    let file_name = format!("Receipt-{}-{}.pdf", sanitize(receipt_number), ts);
    let path = dir.join(&file_name);

    std::fs::write(&path, bytes).map_err(|e| {
        AppError::InternalError(format!("Failed to write print file: {e}"))
    })?;

    let path_str = path.to_string_lossy().to_string();
    let spawned = std::process::Command::new("cmd")
        .args(["/C", "start", "", &path_str])
        .spawn();

    match spawned {
        Ok(_) => Ok(PrintDispatchResult {
            mode: "print".to_string(),
            path: Some(path_str),
            message: "Receipt opened for printing".to_string(),
        }),
        Err(e) => Ok(PrintDispatchResult {
            mode: "print".to_string(),
            path: Some(path_str),
            message: format!("Opened file but failed to launch viewer: {e}"),
        }),
    }
}

fn sanitize(input: &str) -> String {
    let cleaned: String = input
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    if cleaned.is_empty() {
        "receipt".to_string()
    } else {
        cleaned
    }
}
