use serde::Serialize;
use tauri::State;

use crate::database::Database;
use crate::dto::report::{ReportRequest, ReportResponse};
use crate::errors::AppError;
use crate::repositories::settings_repository;
use crate::services::{report_pdf_service, report_service};

use super::db::run_db;

#[tauri::command]
pub async fn generate_report(
    state: State<'_, Database>,
    request: ReportRequest,
) -> Result<ReportResponse, AppError> {
    let conn = state.inner().clone_conn();
    run_db(conn, move |c| report_service::generate_report(c, request)).await
}

#[derive(Serialize)]
pub struct ReportPdfResult {
    pub mode: String,
    pub path: Option<String>,
    pub message: String,
}

#[tauri::command]
pub async fn generate_report_pdf(
    state: State<'_, Database>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<ReportPdfResult, AppError> {
    let conn = state.inner().clone_conn();
    let df = date_from.clone();
    let dt = date_to.clone();
    let (financial, payments, expenses, members, membership_status, gym) =
        tauri::async_runtime::spawn_blocking(move || {
            let guard = conn.lock().unwrap_or_else(|e| e.into_inner());
            let financial =
                report_service::generate_report(&guard, ReportRequest {
                    report_type: "financial".into(),
                    date_from: df.clone(),
                    date_to: dt.clone(),
                    member_id: None,
                    payment_method: None,
                    membership_plan_id: None,
                    expense_category: None,
                })?;
            let payments =
                report_service::generate_report(&guard, ReportRequest {
                    report_type: "payment".into(),
                    date_from: df.clone(),
                    date_to: dt.clone(),
                    member_id: None,
                    payment_method: None,
                    membership_plan_id: None,
                    expense_category: None,
                })?;
            let expenses =
                report_service::generate_report(&guard, ReportRequest {
                    report_type: "expense".into(),
                    date_from: df.clone(),
                    date_to: dt.clone(),
                    member_id: None,
                    payment_method: None,
                    membership_plan_id: None,
                    expense_category: None,
                })?;
            let members =
                report_service::generate_report(&guard, ReportRequest {
                    report_type: "member".into(),
                    date_from: None,
                    date_to: None,
                    member_id: None,
                    payment_method: None,
                    membership_plan_id: None,
                    expense_category: None,
                })?;
            let membership_status =
                report_service::generate_report(&guard, ReportRequest {
                    report_type: "membership_status".into(),
                    date_from: None,
                    date_to: None,
                    member_id: None,
                    payment_method: None,
                    membership_plan_id: None,
                    expense_category: None,
                })?;
            let gym = settings_repository::get_gym_settings(&guard)?;
            Ok::<_, AppError>((financial, payments, expenses, members, membership_status, gym))
        })
        .await
        .map_err(|e| AppError::InternalError(format!("Report task failed: {e}")))??;

    let financial = match financial {
        ReportResponse::Financial(r) => r,
        _ => unreachable!(),
    };
    let payments = match payments {
        ReportResponse::Payment(r) => r,
        _ => unreachable!(),
    };
    let expenses = match expenses {
        ReportResponse::Expense(r) => r,
        _ => unreachable!(),
    };
    let members = match members {
        ReportResponse::Member(r) => r,
        _ => unreachable!(),
    };
    let membership_status = match membership_status {
        ReportResponse::MembershipStatus(r) => r,
        _ => unreachable!(),
    };

    let bytes = report_pdf_service::render_report_pdf(
        &gym,
        &date_from,
        &date_to,
        &financial,
        &payments,
        &expenses,
        &members,
        &membership_status,
    )?;

    let date_label = match (&date_from, &date_to) {
        (Some(f), Some(t)) => format!("{}-to-{}", f, t),
        (Some(f), None) => format!("{}-onwards", f),
        (None, Some(t)) => format!("up-to-{}", t),
        (None, None) => "all-time".to_string(),
    };

    match save_report_dialog(&bytes, &date_label) {
        PdfSaveResult::Saved(path) => Ok(ReportPdfResult {
            mode: "pdf".to_string(),
            path: Some(path),
            message: "Report saved as PDF".to_string(),
        }),
        PdfSaveResult::Cancelled => Ok(ReportPdfResult {
            mode: "cancelled".to_string(),
            path: None,
            message: "Save cancelled".to_string(),
        }),
    }
}

enum PdfSaveResult {
    Saved(String),
    Cancelled,
}

fn save_report_dialog(bytes: &[u8], date_label: &str) -> PdfSaveResult {
    let ts = chrono::Local::now().format("%Y%m%d");
    let file_name = format!("GymReport-{}-{}.pdf", sanitize(date_label), ts);
    let path = rfd::FileDialog::new()
        .set_title("Save Gym Report as PDF")
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

fn sanitize(input: &str) -> String {
    input
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect::<String>()
        .trim_matches('_')
        .to_string()
        .if_empty("report".to_string())
}

trait IfEmpty {
    fn if_empty(self, fallback: Self) -> Self;
}

impl IfEmpty for String {
    fn if_empty(self, fallback: String) -> String {
        if self.is_empty() { fallback } else { self }
    }
}
