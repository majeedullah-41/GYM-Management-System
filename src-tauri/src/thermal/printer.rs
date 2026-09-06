/// Raw Windows spooler output for ESC/POS thermal printers.
///
/// Uses `OpenPrinterW` / `StartDocPrinterW` / `WritePrinter` with the `RAW`
/// datatype so printer commands reach the device untouched. Every spooler call
/// reports the failing stage by name so the UI and logs can say exactly where a
/// print failed. `ClosePrinter` is always attempted so a failed print does not
/// leak the handle.
use std::fmt;

use windows::core::{Error as WinError, PCWSTR, PWSTR};
use windows::Win32::Graphics::Printing::{
    ClosePrinter, DOC_INFO_1W, EndDocPrinter, GetDefaultPrinterW, OpenPrinterW, PRINTER_HANDLE,
    StartDocPrinterW, WritePrinter,
};

#[derive(Debug)]
pub struct PrinterError {
    pub stage: &'static str,
    pub code: u32,
    pub message: String,
}

impl fmt::Display for PrinterError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} ({})", self.stage, self.message)
    }
}

impl std::error::Error for PrinterError {}

fn err_from_windows(stage: &'static str, error: WinError) -> PrinterError {
    PrinterError {
        stage,
        code: error.code().0 as u32,
        message: error.message(),
    }
}

fn err_from_last_error(stage: &'static str) -> PrinterError {
    err_from_windows(stage, WinError::from_win32())
}

fn to_wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(std::iter::once(0)).collect()
}

/// Query the Windows default printer name.
pub fn default_printer_name() -> Result<String, PrinterError> {
    let mut size: u32 = 0;
    unsafe {
        let _ = GetDefaultPrinterW(None, &mut size);
    }
    if size == 0 {
        return Err(err_from_last_error("resolve default printer"));
    }
    let mut buffer = vec![0u16; size as usize];
    let ok = unsafe { GetDefaultPrinterW(Some(PWSTR(buffer.as_mut_ptr())), &mut size) };
    if !ok.as_bool() {
        return Err(err_from_last_error("resolve default printer"));
    }
    let len = buffer.iter().position(|&c| c == 0).unwrap_or(buffer.len());
    Ok(String::from_utf16_lossy(&buffer[..len]))
}

/// Send raw ESC/POS bytes to `printer_name`. The name must be a resolved
/// printer from the user settings; otherwise use `default_printer_name()`.
pub fn send_raw(printer_name: &str, bytes: &[u8]) -> Result<(), PrinterError> {
    let wide_name = to_wide(printer_name);
    let mut handle = PRINTER_HANDLE::default();
    unsafe {
        OpenPrinterW(PCWSTR(wide_name.as_ptr()), &mut handle, None)
            .map_err(|e| err_from_windows("open printer", e))?;
    }

    let document_result = write_document(handle, bytes);
    unsafe {
        let _ = ClosePrinter(handle);
    }
    document_result
}

fn write_document(handle: PRINTER_HANDLE, bytes: &[u8]) -> Result<(), PrinterError> {
    let doc_name = to_wide("Receipt");
    let datatype = to_wide("RAW");
    let doc_info = DOC_INFO_1W {
        pDocName: PWSTR(doc_name.as_ptr() as *mut u16),
        pOutputFile: PWSTR::null(),
        pDatatype: PWSTR(datatype.as_ptr() as *mut u16),
    };

    let job = unsafe { StartDocPrinterW(handle, 1, &doc_info) };
    if job == 0 {
        return Err(err_from_last_error("start document"));
    }

    if bytes.is_empty() {
        unsafe {
            let _ = EndDocPrinter(handle);
        }
        return Ok(());
    }

    let mut written: u32 = 0;
    let ok = unsafe {
        WritePrinter(handle, bytes.as_ptr() as *const core::ffi::c_void, bytes.len() as u32, &mut written)
    };
    if !ok.as_bool() || written != bytes.len() as u32 {
        unsafe {
            let _ = EndDocPrinter(handle);
        }
        return Err(err_from_last_error("write data"));
    }

    let ok_end = unsafe { EndDocPrinter(handle) };
    if !ok_end.as_bool() {
        return Err(err_from_last_error("end document"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn send_raw_stages_error_for_unknown_printer() {
        let err = send_raw("GYMPOS_NO_SUCH_PRINTER_95321", b"\x1b\x40").unwrap_err();
        assert_eq!(err.stage, "open printer");
    }

    #[test]
    fn send_raw_reports_win32_message() {
        let err = send_raw("GYMPOS_NO_SUCH_PRINTER_95321", b"\x1b\x40").unwrap_err();
        assert!(!err.message.is_empty());
    }
}