Set-Location -LiteralPath $PSScriptRoot
python generate_datasets.py
python train_price_model.py
python run_local_api.py
