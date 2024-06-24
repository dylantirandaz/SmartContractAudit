from flask import Flask, request, jsonify, url_for
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from analyzer import analyze_contract
import logging
from celery import Celery
from itsdangerous import URLSafeTimedSerializer
from flask_mail import Mail, Message
import os

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:password@localhost/smartcontractauditor'
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')
app.config['CELERY_BROKER_URL'] = 'redis://localhost:6379/0'
app.config['CELERY_RESULT_BACKEND'] = 'redis://localhost:6379/0'
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')

db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)
limiter = Limiter(app, key_func=get_remote_address)
celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)
mail = Mail(app)

logging.basicConfig(filename='app.log', level=logging.INFO)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)

class AnalysisResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    contract_code = db.Column(db.Text, nullable=False)
    result = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

@celery.task
def analyze_contract_task(contract_code, language):
    return analyze_contract(contract_code, language)

def send_verification_email(user_email):
    serializer = URLSafeTimedSerializer(app.config['JWT_SECRET_KEY'])
    token = serializer.dumps(user_email, salt='email-verify')
    verify_url = url_for('verify_email', token=token, _external=True)
    msg = Message('Verify Your Email', recipients=[user_email])
    msg.body = f'Please click the link to verify your email: {verify_url}'
    mail.send(msg)

@app.route('/register', methods=['POST'])
def register():
    username = request.json.get('username', None)
    email = request.json.get('email', None)
    password = request.json.get('password', None)
    if not username or not email or not password:
        return jsonify({"msg": "Missing username, email or password"}), 400
    if User.query.filter_by(username=username).first() or User.query.filter_by(email=email).first():
        return jsonify({"msg": "Username or email already exists"}), 400
    new_user = User(username=username, email=email, password=generate_password_hash(password))
    db.session.add(new_user)
    db.session.commit()
    send_verification_email(email)
    return jsonify({"msg": "User created successfully. Please check your email to verify your account."}), 201

@app.route('/verify-email/<token>')
def verify_email(token):
    serializer = URLSafeTimedSerializer(app.config['JWT_SECRET_KEY'])
    try:
        email = serializer.loads(token, salt='email-verify', max_age=3600)
    except:
        return jsonify({"msg": "The verification link is invalid or has expired."}), 400
    user = User.query.filter_by(email=email).first()
    if user:
        user.is_verified = True
        db.session.commit()
        return jsonify({"msg": "Email verified successfully. You can now log in."}), 200
    return jsonify({"msg": "User not found"}), 404

@app.route('/login', methods=['POST'])
def login():
    username = request.json.get('username', None)
    password = request.json.get('password', None)
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password, password):
        if not user.is_verified:
            return jsonify({"msg": "Please verify your email before logging in."}), 401
        access_token = create_access_token(identity=username)
        return jsonify(access_token=access_token), 200
    return jsonify({"msg": "Bad username or password"}), 401

@app.route('/analyze', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def analyze():
    contract_code = request.json['code']
    language = request.json.get('language', 'solidity')  # Default to Solidity if not specified
    try:
        task = analyze_contract_task.delay(contract_code, language)
        return jsonify({"task_id": task.id}), 202
    except Exception as e:
        app.logger.error(f"Error during analysis: {str(e)}")
        return jsonify({"error": "An error occurred during analysis"}), 500

@app.route('/result/<task_id>', methods=['GET'])
@jwt_required()
def get_result(task_id):
    task = analyze_contract_task.AsyncResult(task_id)
    if task.state == 'PENDING':
        return jsonify({"state": task.state, "status": "Task is pending..."}), 202
    elif task.state != 'FAILURE':
        # Store the result in the database
        user = User.query.filter_by(username=get_jwt_identity()).first()
        result = AnalysisResult(user_id=user.id, contract_code=task.result['contract_code'], result=task.result['vulnerabilities'])
        db.session.add(result)
        db.session.commit()
        return jsonify({"state": task.state, "result": task.result}), 200
    else:
        return jsonify({"state": task.state, "status": "Task failed"}), 500

@app.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    user = User.query.filter_by(username=get_jwt_identity()).first()
    results = AnalysisResult.query.filter_by(user_id=user.id).order_by(AnalysisResult.created_at.desc()).limit(10).all()
    return jsonify([{
        "id": result.id,
        "created_at": result.created_at,
        "vulnerabilities": result.result
    } for result in results]), 200

if __name__ == '__main__':
    app.run(debug=True)
