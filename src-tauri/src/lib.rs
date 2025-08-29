#[cfg(windows)]
use winapi::um::winspool::{OpenPrinterA, StartDocPrinterA, StartPagePrinter, WritePrinter, EndPagePrinter, EndDocPrinter, ClosePrinter, GetDefaultPrinterA, EnumPrintersA};

#[cfg(windows)]
use winapi::um::errhandlingapi::GetLastError;
#[cfg(windows)]
use winapi::shared::minwindef::{DWORD, FALSE, TRUE};
#[cfg(windows)]
use winapi::ctypes::c_void;
#[cfg(windows)]
use std::ffi::{CString, CStr, c_char};
#[cfg(windows)]
use std::ptr;

#[cfg(windows)]
#[repr(C)]
struct DocInfo1A {
    pDocName: *mut c_char,
    pOutputFile: *mut c_char,
    pDatatype: *mut c_char,
}

// Helper: get default printer name (Windows)
#[tauri::command]
fn get_default_printer() -> Result<String, String> {
    #[cfg(windows)]
    {
        let mut buffer_size: DWORD = 0;
        unsafe {
            GetDefaultPrinterA(ptr::null_mut(), &mut buffer_size);
        }

        if buffer_size > 0 {
            let mut buffer: Vec<u8> = vec![0; buffer_size as usize];
            let success = unsafe {
                GetDefaultPrinterA(buffer.as_mut_ptr() as *mut c_char, &mut buffer_size)
            };

            if success == TRUE {
                // strip trailing nulls
                while buffer.last() == Some(&0) { buffer.pop(); }
                if let Ok(printer_name) = CString::new(buffer) {
                    return Ok(printer_name.to_string_lossy().to_string());
                }
            }
        }
        Err("Default printer not found".to_string())
    }
    #[cfg(not(windows))]
    {
        Err("Not supported".to_string())
    }
}

#[cfg(windows)]
#[repr(C)]
struct PRINTER_INFO_1A {
    flags: DWORD,
    pDescription: *mut c_char,
    pName: *mut c_char,
    pComment: *mut c_char,
}

// List available local printers (Windows)
#[tauri::command]
fn list_printers() -> Result<Vec<String>, String> {
    #[cfg(windows)]
    unsafe {
        let mut needed: DWORD = 0;
        let mut returned: DWORD = 0;
        // Level 1: PRINTER_INFO_1A
        EnumPrintersA(
            0x02, // PRINTER_ENUM_LOCAL
            ptr::null_mut(),
            1,
            ptr::null_mut(),
            0,
            &mut needed,
            &mut returned,
        );
        if needed == 0 {
            return Ok(Vec::new());
        }
        let mut buffer: Vec<u8> = vec![0; needed as usize];
        let success = EnumPrintersA(
            0x02,
            ptr::null_mut(),
            1,
            buffer.as_mut_ptr(),
            needed,
            &mut needed,
            &mut returned,
        );
        if success == FALSE {
            return Err("EnumPrintersA failed".to_string());
        }
        let ptr_info = buffer.as_ptr() as *const PRINTER_INFO_1A;
        let mut names: Vec<String> = Vec::new();
        for i in 0..returned {
            let info = ptr_info.add(i as usize).as_ref().unwrap();
            if !info.pName.is_null() {
                let cstr = CStr::from_ptr(info.pName);
                if let Ok(s) = cstr.to_str() {
                    names.push(s.to_string());
                }
            }
        }
        Ok(names)
    }
    #[cfg(not(windows))]
    {
        Err("Not supported".to_string())
    }
}

// Tauri command for direct printing to POS printer
#[tauri::command]
async fn print_to_pos(content: String, printer_name: Option<String>) -> Result<String, String> {
    #[cfg(windows)]
    {
        println!("🖨️ Starting POS print job...");
        
        let content_bytes = content.as_bytes();
        
        // First, try to get default printer name
        let mut default_printer_name: Option<CString> = None;
        let mut buffer_size: DWORD = 0;
        
        // Get required buffer size
        unsafe {
            GetDefaultPrinterA(ptr::null_mut(), &mut buffer_size);
        }
        
        if buffer_size > 0 {
            let mut buffer: Vec<u8> = vec![0; buffer_size as usize];
            let success = unsafe {
                GetDefaultPrinterA(buffer.as_mut_ptr() as *mut c_char, &mut buffer_size)
            };
            
            if success == TRUE {
                // Remove null terminator and convert to string
                while buffer.last() == Some(&0) {
                    buffer.pop();
                }
                if let Ok(printer_name) = CString::new(buffer) {
                    println!("🖨️ Found default printer: {:?}", printer_name.to_string_lossy());
                    default_printer_name = Some(printer_name);
                }
            }
        }
        
        if default_printer_name.is_none() {
            println!("⚠️ No default printer found, will try system default");
        }
        
        // List all available printers for debugging
        println!("🔍 Enumerating available printers...");
        let mut needed: DWORD = 0;
        let mut returned: DWORD = 0;
        
        // First call to get required buffer size
        unsafe {
            EnumPrintersA(
                0x02, // PRINTER_ENUM_LOCAL
                ptr::null_mut(),
                2, // Level 2 (PRINTER_INFO_2)
                ptr::null_mut(),
                0,
                &mut needed,
                &mut returned
            );
        }
        
        if needed > 0 {
            let mut buffer: Vec<u8> = vec![0; needed as usize];
            let success = unsafe {
                EnumPrintersA(
                    0x02, // PRINTER_ENUM_LOCAL
                    ptr::null_mut(),
                    2, // Level 2
                    buffer.as_mut_ptr(),
                    needed,
                    &mut needed,
                    &mut returned
                )
            };
            
            if success == TRUE && returned > 0 {
                println!("📋 Found {} local printers", returned);
                // Note: Proper parsing of PRINTER_INFO_2 structures would require more complex code
                // For now, just report that we found printers
            } else {
                println!("❌ Failed to enumerate printers");
            }
        } else {
            println!("❌ No local printers found");
        }
        
        // Try TEXT data type first, then fallback to RAW
        let data_types = ["TEXT", "RAW"];
        
        for data_type_str in &data_types {
            println!("🔄 Trying data type: {}", data_type_str);
            
            // Try to open printer with explicit name first, then fallback to null
            let mut printer_handle: *mut c_void = ptr::null_mut();
            
            let printer_name_ptr = if let Some(ref explicit_name) = printer_name {
                // Use provided name if any
                match CString::new(explicit_name.clone()) {
                    Ok(c) => c.as_ptr() as *mut c_char,
                    Err(_) => ptr::null_mut(),
                }
            } else if let Some(ref name) = default_printer_name {
                name.as_ptr() as *mut c_char
            } else {
                ptr::null_mut() // fallback to system default
            };
            
            let open_result = unsafe {
                OpenPrinterA(
                    printer_name_ptr,
                    &mut printer_handle as *mut *mut c_void,
                    ptr::null_mut()
                )
            };
            
            if open_result == FALSE {
                // Get last error code for better diagnostics
                let error_code = unsafe { GetLastError() };
                println!("❌ Failed to open printer with {}: Error {}", data_type_str, error_code);
                continue; // Try next data type
            }
            
            println!("✅ Successfully opened printer handle with {}", data_type_str);
            
            // Document info - try different approaches
            let doc_name = CString::new("ResPoint POS Receipt").map_err(|e| format!("Failed to create doc name: {}", e))?;
            let data_type = CString::new(*data_type_str).map_err(|e| format!("Failed to create data type: {}", e))?;
            let nul_output = CString::new("NUL").map_err(|e| format!("Failed to create NUL output: {}", e))?;
            
            // For some POS printers, try different output approaches
            let output_file = if *data_type_str == "RAW" {
                ptr::null_mut()
            } else {
                // For TEXT, try with NUL output to bypass spooler issues
                nul_output.as_ptr() as *mut c_char
            };
            
            let doc_info = DocInfo1A {
                pDocName: doc_name.as_ptr() as *mut c_char,
                pOutputFile: output_file,
                pDatatype: data_type.as_ptr() as *mut c_char,
            };
            
            // Start print job
            let job_id = unsafe { StartDocPrinterA(printer_handle, 1, &doc_info as *const _ as *mut _) };
            
            if job_id == 0 {
                let error_code = unsafe { GetLastError() };
                unsafe { ClosePrinter(printer_handle); }
                println!("❌ Failed to start print job with {}: Error {}", data_type_str, error_code);
                
                match error_code {
                    6 => println!("   🔍 Error 6 (INVALID_HANDLE): Printer might not support this data type or document format"),
                    5 => println!("   🔍 Error 5 (ACCESS_DENIED): Permission denied, run as administrator"),
                    2 => println!("   🔍 Error 2 (FILE_NOT_FOUND): Printer not found or offline"),
                    _ => println!("   🔍 Unknown error code: {}", error_code),
                }
                
                continue; // Try next data type
            }
            
            println!("✅ Print job started with ID: {} using {}", job_id, data_type_str);
            
            // Start page
            let page_result = unsafe { StartPagePrinter(printer_handle) };
            if page_result == FALSE {
                let error_code = unsafe { GetLastError() };
                unsafe { 
                    EndDocPrinter(printer_handle);
                    ClosePrinter(printer_handle); 
                }
                println!("❌ Failed to start page with {}: Error {}", data_type_str, error_code);
                continue; // Try next data type
            }
            
            println!("✅ Page started successfully with {}", data_type_str);
            
            // Write data
            let content_len = content_bytes.len();
            println!("📄 Writing {} bytes to printer using {}", content_len, data_type_str);
            
            let mut bytes_written: DWORD = 0;
            let write_result = unsafe {
                WritePrinter(
                    printer_handle,
                    content_bytes.as_ptr() as *mut c_void,
                    content_len as DWORD,
                    &mut bytes_written
                )
            };
            
            if write_result == FALSE {
                let error_code = unsafe { GetLastError() };
                unsafe { 
                    EndPagePrinter(printer_handle);
                    EndDocPrinter(printer_handle);
                    ClosePrinter(printer_handle); 
                }
                println!("❌ Failed to write with {}: Error {}. Bytes written: {}/{}", data_type_str, error_code, bytes_written, content_len);
                continue; // Try next data type
            }
            
            println!("✅ Successfully wrote {}/{} bytes to printer using {}", bytes_written, content_len, data_type_str);
            
            // End page and document
            unsafe { 
                EndPagePrinter(printer_handle);
                EndDocPrinter(printer_handle);
                ClosePrinter(printer_handle); 
            }
            
            return Ok(format!("Successfully printed {} bytes using {} data type", bytes_written, data_type_str));
        }
        
        // If we reach here, both data types failed
        Err("Failed to print with both TEXT and RAW data types. Check printer connection and driver.".to_string())
    }
    
    #[cfg(not(windows))]
    {
        Err("Printing is only supported on Windows".to_string())
    }
}

#[cfg(windows)]
use winapi::um::shobjidl_core::ITaskbarList3;
#[cfg(windows)]
use winapi::um::objbase::COINIT_APARTMENTTHREADED;
#[cfg(windows)]
use winapi::um::combaseapi::{CoCreateInstance, CoUninitialize, CoInitializeEx};
#[cfg(windows)]
use winapi::shared::guiddef::GUID;
#[cfg(windows)]
use winapi::shared::wtypesbase::CLSCTX_INPROC_SERVER;
#[cfg(windows)]
use winapi::shared::windef::HWND;
#[cfg(windows)]
use winapi::um::wingdi::{CreateCompatibleDC, DeleteDC, SelectObject, CreateSolidBrush, CreatePen, DeleteObject, SetBkMode, SetTextColor, CreateFontW, RGB, BITMAPINFO, BITMAPINFOHEADER, BI_RGB};
#[cfg(windows)]
use winapi::um::wingdi::{CreateDIBSection, DIB_RGB_COLORS};
#[cfg(windows)]
use winapi::shared::windef::{HBITMAP, HBRUSH, HPEN, HFONT, RECT, HICON};
#[cfg(windows)]
use winapi::um::winuser::{CreateIconIndirect, ICONINFO, GetDC, ReleaseDC, DrawTextW, DT_CENTER, DT_VCENTER, DT_SINGLELINE};
#[cfg(windows)]
use winapi::Interface;
#[cfg(windows)]
use std::mem::transmute;
#[cfg(windows)]
use std::ptr::null_mut;

#[tauri::command]
fn set_taskbar_overlay(count: i32, window: tauri::Window) -> Result<(), String> {
    #[cfg(windows)]
    unsafe {
        // Initialize COM
        let hr = CoInitializeEx(std::ptr::null_mut(), COINIT_APARTMENTTHREADED);
        if hr < 0 { return Err("CoInitializeEx failed".into()); }

        // Create TaskbarList
        let mut taskbar_ptr: *mut ITaskbarList3 = std::ptr::null_mut();
        let clsid_taskbar = GUID { Data1: 0x56FDF344, Data2: 0xFD6D, Data3: 0x11D0, Data4: [0x95,0x8A,0x00,0x60,0x97,0xC9,0xA0,0x90] };
        let hr2 = CoCreateInstance(
            &clsid_taskbar,
            std::ptr::null_mut(),
            CLSCTX_INPROC_SERVER,
            &ITaskbarList3::uuidof(),
            &mut taskbar_ptr as *mut _ as *mut _
        );
        if hr2 < 0 || taskbar_ptr.is_null() {
            CoUninitialize();
            return Err("CoCreateInstance ITaskbarList3 failed".into());
        }
        let taskbar = &*taskbar_ptr;

        // Get HWND from tauri window (convert windows-rs HWND to winapi HWND)
        let hwnd: HWND = {
            let w = window.hwnd().map_err(|e| e.to_string())?;
            transmute(w)
        };

        if count <= 0 {
            // Clear overlay
            let _ = (*taskbar).SetOverlayIcon(hwnd, std::ptr::null_mut(), std::ptr::null());
            CoUninitialize();
            return Ok(());
        }

        // Create an in-memory 32x32 ARGB bitmap and draw a red circle + white number
        let size: i32 = 32;
        let mut bmi: BITMAPINFO = std::mem::zeroed();
        bmi.bmiHeader = BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: size,
            biHeight: -size, // top-down DIB
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB,
            biSizeImage: 0,
            biXPelsPerMeter: 0,
            biYPelsPerMeter: 0,
            biClrUsed: 0,
            biClrImportant: 0,
        };
        let screen_dc = GetDC(null_mut());
        if screen_dc.is_null() {
            CoUninitialize();
            return Err("GetDC failed".into());
        }
        let mem_dc = CreateCompatibleDC(screen_dc);
        let mut bits_ptr: *mut winapi::ctypes::c_void = null_mut();
        let dib: HBITMAP = CreateDIBSection(mem_dc, &bmi, DIB_RGB_COLORS, &mut bits_ptr, null_mut(), 0);
        if dib.is_null() {
            ReleaseDC(null_mut(), screen_dc);
            CoUninitialize();
            return Err("CreateDIBSection failed".into());
        }
        let old_bmp = SelectObject(mem_dc, dib as _);

        // Clear with transparent
        // Bits already zeroed by CreateDIBSection

        // Draw red circle
        let brush: HBRUSH = CreateSolidBrush(RGB(220, 38, 38)); // tailwind red-600 like
        let pen: HPEN = CreatePen(0, 0, RGB(220, 38, 38));
        let old_brush = SelectObject(mem_dc, brush as _);
        let old_pen = SelectObject(mem_dc, pen as _);
        let margin = 2;
        winapi::um::wingdi::Ellipse(mem_dc, margin, margin, size - margin, size - margin);

        // Draw white text centered
        SetBkMode(mem_dc, 1); // TRANSPARENT
        SetTextColor(mem_dc, RGB(255, 255, 255));
        let mut rect: RECT = RECT { left: 0, top: 0, right: size, bottom: size };
        let value = if count > 99 { String::from("99") } else { count.to_string() };
        // Slightly bold, adapted to small size
        let font: HFONT = CreateFontW(
            20, 0, 0, 0, 700, 0, 0, 0, 0, 0, 0, 0, 0,
            [0u16; 32].as_ptr(), // default
        );
        let old_font = if !font.is_null() { SelectObject(mem_dc, font as _) } else { null_mut() };
        let wstr: Vec<u16> = value.encode_utf16().chain(std::iter::once(0)).collect();
        DrawTextW(mem_dc, wstr.as_ptr(), -1, &mut rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

        // Create HICON from DIB
        let mut icon_info = ICONINFO {
            fIcon: 1,
            xHotspot: 0,
            yHotspot: 0,
            hbmMask: null_mut(),
            hbmColor: dib,
        };
        let hicon: HICON = CreateIconIndirect(&mut icon_info as *mut _);

        // Cleanup GDI objects
        if !old_font.is_null() { SelectObject(mem_dc, old_font); }
        if !font.is_null() { DeleteObject(font as _); }
        SelectObject(mem_dc, old_brush);
        SelectObject(mem_dc, old_pen);
        DeleteObject(brush as _);
        DeleteObject(pen as _);
        SelectObject(mem_dc, old_bmp);
        DeleteDC(mem_dc);
        ReleaseDC(null_mut(), screen_dc);

        if hicon.is_null() {
            CoUninitialize();
            return Err("CreateIconIndirect failed".into());
        }

        let _ = (*taskbar).SetOverlayIcon(hwnd, hicon as _, std::ptr::null());
        CoUninitialize();
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = count; let _ = window;
        Err("Overlay icon not supported on this OS".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![get_default_printer, list_printers, print_to_pos, set_taskbar_overlay])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
