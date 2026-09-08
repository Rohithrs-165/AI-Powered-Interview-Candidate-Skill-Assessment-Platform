"""
Kaggle Dataset Downloader for ML Engine
Downloads genuine Software Engineering Interview Questions and Resume datasets from Kaggle.
"""
import os
import io
import zipfile
import urllib.request
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

def download_software_questions():
    url = "https://www.kaggle.com/api/v1/datasets/download/syedmharis/software-engineering-interview-questions-dataset"
    target_csv = os.path.join(DATA_DIR, "kaggle_software_questions.csv")
    print("\n" + "=" * 80)
    print(f"[DOWNLOADING] Kaggle Software Engineering Interview Questions...")
    print(f"Source URL: {url}")
    
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        content = resp.read()
        print(f"Downloaded zip: {len(content)} bytes")
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            print("Files in archive:", z.namelist())
            for name in z.namelist():
                if name.endswith(".csv"):
                    raw = z.read(name)
                    try:
                        df = pd.read_csv(io.BytesIO(raw), encoding="latin1")
                    except Exception:
                        df = pd.read_csv(io.BytesIO(raw), encoding="utf-8", errors="replace")
                    df.to_csv(target_csv, index=False, encoding="utf-8")
                    print(f"Saved extracted dataset: {target_csv}")
                    print(f"Shape: {df.shape} | Columns: {list(df.columns)}")
                    print(df.head(2))
                    return df

def download_resumes():
    url = "https://www.kaggle.com/api/v1/datasets/download/snehaanbhawal/resume-dataset"
    target_csv = os.path.join(DATA_DIR, "kaggle_resumes.csv")
    print("\n" + "=" * 80)
    print(f"[DOWNLOADING] Kaggle Real Resumes Dataset...")
    print(f"Source URL: {url}")
    
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=90) as resp:
        content = resp.read()
        print(f"Downloaded zip: {len(content)} bytes ({len(content)/(1024*1024):.2f} MB)")
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            csv_candidates = [n for n in z.namelist() if n.endswith("Resume.csv") or n.endswith(".csv")]
            print("Target CSV found:", csv_candidates[0])
            raw = z.read(csv_candidates[0])
            try:
                df = pd.read_csv(io.BytesIO(raw), encoding="utf-8")
            except Exception:
                df = pd.read_csv(io.BytesIO(raw), encoding="latin1")
            
            # Filter tech-focused roles for optimal interview system relevance
            tech_categories = [
                'INFORMATION-TECHNOLOGY', 'ENGINEERING', 'DATA SCIENCE', 
                'SOFTWARE DEVELOPER', 'DIGITAL MEDIA', 'DESIGNER'
            ]
            if 'Category' in df.columns:
                tech_df = df[df['Category'].str.upper().isin(tech_categories)]
                if len(tech_df) > 0:
                    df_to_save = tech_df
                else:
                    df_to_save = df
            else:
                df_to_save = df

            df_to_save.to_csv(target_csv, index=False, encoding="utf-8")
            print(f"Saved extracted dataset: {target_csv}")
            print(f"Shape: {df_to_save.shape} | Columns: {list(df_to_save.columns)}")
            print(df_to_save['Category'].value_counts() if 'Category' in df_to_save.columns else df_to_save.head(2))
            return df_to_save

if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    download_software_questions()
    download_resumes()
    print("\n[SUCCESS] Kaggle datasets successfully downloaded and processed.")

