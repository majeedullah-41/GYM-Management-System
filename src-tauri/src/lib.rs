mod commands;
mod database;
mod dto;
mod errors;
mod models;
mod repositories;
mod services;
mod utils;

use database::Database;
use tauri::Manager;

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

            app.manage(Database::new(conn));
            log::info!("Database initialized successfully");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
            commands::printing::print_receipt_json,
            commands::printing::save_pdf_bytes,
            commands::reports::generate_report,
            commands::reports::generate_report_pdf,
            commands::settings::get_all_settings,
            commands::settings::save_gym_settings,
            commands::settings::save_receipt_settings,
            commands::settings::save_print_settings,
            commands::settings::backup_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
