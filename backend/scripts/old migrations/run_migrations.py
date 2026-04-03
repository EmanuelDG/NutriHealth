import subprocess
import os
import sys
from pathlib import Path

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


backend_dir = Path(__file__).parent.absolute()
os.chdir(backend_dir)

def run_migrations():
    print("Running database migrations...")
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"], 
            capture_output=True, 
            text=True, 
            check=True
        )
        print(result.stdout)
        print("Migrations completed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Error running migrations: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        sys.exit(1)

if __name__ == "__main__":
    run_migrations() 