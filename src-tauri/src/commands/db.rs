use std::sync::{Arc, Mutex};

use rusqlite::Connection;

use crate::errors::AppError;

pub async fn run_db<T, F>(conn: Arc<Mutex<Connection>>, f: F) -> Result<T, AppError>
where
    T: Send + 'static,
    F: FnOnce(&Connection) -> Result<T, AppError> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(move || {
        let guard = conn.lock().unwrap_or_else(|e| e.into_inner());
        f(&guard)
    })
    .await
    .map_err(|e| AppError::InternalError(format!("Database task failed: {e}")))?
}
