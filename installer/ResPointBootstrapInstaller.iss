; ResPoint Bootstrap Installer
; ----------------------------
; Ovo je "wrapper" installer sa prilagođenim prozorom koji maksimalno
; liči na UI tvoje aplikacije. U pozadini pokreće Tauri/NSIS installer
; koji već dobijaš iz build procesa.
;
; Koraci za korišćenje:
; 1) Pokreni svoj uobičajeni release skript:
;      npm run release   (ili kako već radiš svoj build)
;    Ovo će u folderu "dist-release" napraviti:
;      - verzioni NSIS installer (npr. ResPoint_0.1.56_x64-setup.exe)
;      - stabilni alias: ResPoint_nsis_installer.exe
; 2) U Inno Setup-u otvori ovaj .iss fajl i klikni "Compile".
; 3) Dobijeni .exe (ResPoint_CustomSetup.exe) je tvoj novi, vizuelno
;    prilagođen installer koji možeš da deliš korisnicima.

#define AppName "ResPoint"
#define AppVersion "0.1.0"
#define AppPublisher "ResPoint"
#define AppURL "https://respoint.app"

[Setup]
; Ovo je samo bootstrapper – ne registruje se kao poseban program
AppId={{F7999D47-F5FB-4FE4-9EF8-EE758B3B6C60}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}

CreateAppDir=no
Uninstallable=no
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=yes

OutputDir=.
; Ovo određuje ime izlaznog .exe fajla (bez .exe ekstenzije)
OutputBaseFilename=ResPoint
SetupIconFile=..\src-tauri\icons\icon.ico
WizardStyle=modern
Compression=lzma
SolidCompression=yes
UsePreviousAppDir=no

; Ako želiš, ovde možeš dodati i LicenseFile ili InfoBeforeFile
; LicenseFile=license.txt

[Files]
; NSIS installer generiše tvoj postojeći build/release proces.
; release.js sada uvek pravi stabilno ime: ResPoint_nsis_installer.exe
Source: "..\dist-release\ResPoint_nsis_installer.exe"; \
  DestDir: "{tmp}"; DestName: "ResPoint_NSIS_Setup.exe"; Flags: deleteafterinstall

[Run]
; Pokrećemo pravi NSIS installer u tihom modu, dok korisnik vidi naš
; prilagođeni prozor. Po potrebi možeš izbaciti /SILENT da se vidi i NSIS UI.
Filename: "{tmp}\ResPoint_NSIS_Setup.exe"; \
  Parameters: "/SILENT"; \
  StatusMsg: "Installing ResPoint..."; \
  Flags: runhidden

[Code]

procedure InitializeWizard;
begin
  { Naslov prozora – koristi puno ime aplikacije }
  WizardForm.Caption := 'ResPoint - Restaurant Management System';

  { Pozadinske boje – tamna šema, da liči na aplikaciju }
  WizardForm.Color := $0010121E;             { tamno plavo }

  { Welcome strana – tekst prilagođen ResPoint-u }
  if WizardForm.WelcomeLabel1 <> nil then
  begin
    WizardForm.WelcomeLabel1.Caption := 'Welcome to ResPoint';
    WizardForm.WelcomeLabel1.Font.Name := 'Segoe UI';
    WizardForm.WelcomeLabel1.Font.Size := 18;
    WizardForm.WelcomeLabel1.Font.Style := [fsBold];
  end;

  if WizardForm.WelcomeLabel2 <> nil then
  begin
    WizardForm.WelcomeLabel2.Caption :=
      'Restaurant Management System for easier reservations and floor plans.';
    WizardForm.WelcomeLabel2.Font.Name := 'Segoe UI';
    WizardForm.WelcomeLabel2.Font.Size := 10;
  end;

  { Dugmad – malo mekši stil, da liči na moderan UI }
  WizardForm.NextButton.Caption := 'Install';
  WizardForm.CancelButton.Caption := 'Close';
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  { Tokom "instalacije" menjamo tekst da zvuči lepše }
  if CurPageID = wpInstalling then
  begin
    WizardForm.StatusLabel.Caption := 'Installing ResPoint...';
    WizardForm.FilenameLabel.Caption := '';
  end
  else if CurPageID = wpFinished then
  begin
    WizardForm.FinishedHeadingLabel.Caption := 'ResPoint is ready to use';
    WizardForm.FinishedLabel.Caption :=
      'ResPoint has been installed successfully.' + #13#10#13#10 +
      'You can now launch the application from the Start menu or desktop shortcut.';
  end;
end;


