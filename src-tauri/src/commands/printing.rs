use tauri::{WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub fn print_receipt_json(app: tauri::AppHandle, receipt_json: String) -> Result<(), String> {
    let label = format!("print-{}", uuid::Uuid::new_v4());

    let print_window = WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::App("print.html".into()),
    )
    .title("Print Receipt")
    .inner_size(420.0, 700.0)
    .visible(false)
    .build()
    .map_err(|e| e.to_string())?;

    let wv = print_window.clone();

    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(400));

        let escaped = receipt_json
            .replace('\\', "\\\\")
            .replace('`', "\\`")
            .replace("${", "\\${");
        let script = format!(
            "try {{ renderReceipt(JSON.parse(`{}`)); }} catch(e) {{ document.body.textContent = e.message; }}",
            escaped
        );
        let _ = wv.eval(&script);

        std::thread::sleep(std::time::Duration::from_millis(4000));
        let _ = wv.close();
    });

    Ok(())
}
