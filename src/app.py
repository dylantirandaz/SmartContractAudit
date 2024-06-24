# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from analyzer import analyze_contract

app = Flask(__name__)
CORS(app)

@app.route('/analyze', methods=['POST'])
def analyze():
    contract_code = request.json['code']
    results = analyze_contract(contract_code)
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)
