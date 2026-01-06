use std::fs;
use tauri::command;

#[derive(serde::Serialize)]
pub struct DesignFile {
    pub path: String,
    pub content: String,
}

#[command]
pub fn read_design_file(path: String) -> Result<DesignFile, String> {
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    Ok(DesignFile { path, content })
}

#[command]
pub fn write_design_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[command]
pub fn get_system_fonts() -> Result<Vec<String>, String> {
    let mut fonts = Vec::new();

    #[cfg(target_os = "macos")]
    {
        let font_dirs = [
            "/System/Library/Fonts",
            "/Library/Fonts",
        ];

        for dir in font_dirs {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    if let Some(name) = entry.file_name().to_str() {
                        if name.ends_with(".ttf") || name.ends_with(".otf") || name.ends_with(".ttc") {
                            fonts.push(name.to_string());
                        }
                    }
                }
            }
        }

        // Also check user fonts
        if let Ok(home) = std::env::var("HOME") {
            let user_fonts = format!("{}/Library/Fonts", home);
            if let Ok(entries) = fs::read_dir(&user_fonts) {
                for entry in entries.flatten() {
                    if let Some(name) = entry.file_name().to_str() {
                        if name.ends_with(".ttf") || name.ends_with(".otf") || name.ends_with(".ttc") {
                            fonts.push(name.to_string());
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let font_dirs = [
            "/usr/share/fonts",
            "/usr/local/share/fonts",
        ];

        for dir in font_dirs {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    if let Some(name) = entry.file_name().to_str() {
                        fonts.push(name.to_string());
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(entries) = fs::read_dir("C:\\Windows\\Fonts") {
            for entry in entries.flatten() {
                if let Some(name) = entry.file_name().to_str() {
                    if name.ends_with(".ttf") || name.ends_with(".otf") || name.ends_with(".ttc") {
                        fonts.push(name.to_string());
                    }
                }
            }
        }
    }

    fonts.sort();
    fonts.dedup();
    Ok(fonts)
}
