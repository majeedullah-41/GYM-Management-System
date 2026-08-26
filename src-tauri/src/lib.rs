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
            std::fs::create_dir_all(&app_dir)
                .expect("Failed to create app data directory");

            let db_path = app_dir.join("gym.db");
            log::info!("Initializing database at {:?}", db_path);

            let conn =
                database::init_db(&db_path).expect("Failed to initialize database");

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
