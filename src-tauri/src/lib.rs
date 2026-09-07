mod commands;
mod database;
mod dto;
mod errors;
mod licensing;
mod models;
mod repositories;
mod services;
mod thermal;
mod utils;

use database::Database;
use services::auth_service::AuthState;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;

static CLOSING_BACKUP_STARTED: AtomicBool = AtomicBool::new(false);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    log::info!("Starting Gym POS");

    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");

            let db_path = app_dir.join("gym.db");
            log::info!("Initializing database at {:?}", db_path);

            let conn = database::init_db(&db_path).expect("Failed to initialize database");

            let database = Database::new(conn);
            services::backup_service::start_daily_backup_worker(database.clone_conn());
            let license_service = licensing::init(&app_dir);
            app.manage(license_service);
            app.manage(database);
            app.manage(AuthState::default());
            log::info!("Database initialized successfully");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::get_auth_status,
            commands::auth::login,
            commands::auth::logout,
            commands::auth::get_current_user,
            commands::auth::get_recovery_question,
            commands::auth::verify_recovery_answer,
            commands::auth::reset_password,
            commands::auth::change_username,
            commands::auth::change_password,
            commands::auth::change_security_question,
            commands::advance_payments::preview_advance_payment,
            commands::advance_payments::create_advance_payment,
            commands::membership_plans::create_plan,
            commands::membership_plans::get_plan,
            commands::membership_plans::list_plans,
            commands::membership_plans::list_active_plans,
            commands::membership_plans::update_plan,
            commands::membership_plans::deactivate_plan,
            commands::membership_plans::reactivate_plan,
            commands::members::create_member,
            commands::members::get_member,
            commands::members::list_members,
            commands::members::update_member,
            commands::members::archive_member,
            commands::members::unarchive_member,
            commands::members::permanently_delete_member,
            commands::payments::create_payment,
            commands::payments::get_payment,
            commands::payments::list_payments,
            commands::payments::update_payment,
            commands::payments::list_member_payments,
            commands::payments::get_payment_summary,
            commands::payments::void_payment,
            commands::billing::get_membership_billing_summary,
            commands::receipts::get_receipt_by_payment_id,
            commands::receipts::get_receipt_by_number,
            commands::expenses::create_expense,
            commands::expenses::get_expense,
            commands::expenses::update_expense,
            commands::expenses::delete_expense,
            commands::expenses::list_expenses,
            commands::expenses::total_expenses,
            commands::expenses::restore_expense,
            commands::dashboard::get_dashboard_summary,
            commands::license::get_license_status,
            commands::license::get_hardware_id,
            commands::license::import_license,
            commands::license::replace_license,
            commands::license::select_license_file,
            commands::license::validate_license,
            commands::printing::print_receipt_json,
            commands::printing::print_thermal_receipt,
            commands::printing::save_pdf_bytes,
            commands::reports::generate_report,
            commands::reports::generate_report_pdf,
            commands::settings::get_all_settings,
            commands::settings::save_gym_settings,
            commands::settings::save_receipt_settings,
            commands::settings::save_print_settings,
            commands::settings::save_backup_settings,
            commands::settings::select_backup_folder,
            commands::settings::select_gym_logo,
            commands::settings::backup_database,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if !CLOSING_BACKUP_STARTED.swap(true, Ordering::SeqCst) {
                    let state = window.state::<Database>();
                    let conn = state.clone_conn();
                    match conn.lock() {
                        Ok(guard) => {
                            if let Err(error) = services::backup_service::run_closing_backup(&guard)
                            {
                                log::error!("Backup on close failed: {error}");
                            }
                        }
                        Err(_) => log::error!("Backup on close could not access the database"),
                    };
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
