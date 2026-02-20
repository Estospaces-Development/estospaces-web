$files = Get-ChildItem -Path "src" -Filter "*.tsx" -Recurse
$files += Get-ChildItem -Path "src" -Filter "*.ts" -Recurse
 
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
 
    # 1. Fix incorrect default import for Link
    $content = $content -replace "import Link from 'react-router-dom';", "import { Link } from 'react-router-dom';"
    
    # 2. Fix multiple imports from react-router-dom by merging them if they exist
    # This is complex in regex, let's at least fix common duplicates
    if ($content -match "import \{.*\} from 'react-router-dom';" -and $content -match "import \{.*\} from 'react-router-dom';") {
       # Just a simple check for common ones like Link and useNavigate being separate
       if ($content -match "import \{ Link \} from 'react-router-dom';" -and $content -match "import \{ useNavigate \} from 'react-router-dom';") {
           $content = $content -replace "import \{ Link \} from 'react-router-dom';\r?\nimport \{ useNavigate \} from 'react-router-dom';", "import { Link, useNavigate } from 'react-router-dom';"
           $content = $content -replace "import \{ useNavigate \} from 'react-router-dom';\r?\nimport \{ Link \} from 'react-router-dom';", "import { Link, useNavigate } from 'react-router-dom';"
       }
    }

    # 3. Handle cases where both Link and useNavigate are needed but only one is imported
    # ... actually let's just run the build and see where it fails, it's safer.
 
    if ($content -ne $originalContent) {
        Write-Host "Updating $($file.FullName)"
        Set-Content -Path $file.FullName -Value $content -NoNewline
    }
}
