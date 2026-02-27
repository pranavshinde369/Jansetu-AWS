from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any
import boto3
import json
import os
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from PyPDF2 import PdfReader, PdfWriter

app = FastAPI(title="JanSetu Saathi API", description="Multi-turn empathetic voice assistant for users")

# Initialize AWS Bedrock Client
bedrock = boto3.client(service_name='bedrock-runtime', region_name='us-east-1')
MODEL_ID = 'amazon.nova-pro-v1:0'

# ==========================================
# --- MODULE 1: SCHEME DISCOVERY & PDF ---
# ==========================================

# --- 1. LOAD THE NEW SCHEME DATABASE ---
def load_scheme_database():
    try:
        db_path = os.path.join(os.path.dirname(__file__), 'schemes_db.json')
        with open(db_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            schemes = data.get("schemes", []) 
        
        formatted_db = "AVAILABLE GOVERNMENT SCHEMES:\n"
        for scheme in schemes:
            formatted_db += f"\n- Name: {scheme['name']}\n"
            formatted_db += f"  Keywords: {', '.join(scheme['keywords'])}\n"
            formatted_db += f"  Purpose: {scheme['description']}\n"
            formatted_db += f"  Required Details to Ask User: {', '.join(scheme['required_details'])}\n"
            formatted_db += f"  PDF Template File: {scheme['pdf_template']}\n"
            formatted_db += f"  Action Required (Final Step): {scheme.get('action_required', 'Bring necessary documents.')}\n"
        
        return formatted_db, schemes
    except Exception as e:
        print(f"Error loading scheme database: {e}")
        return "Error: Could not load schemes.", []

# Load the DB
SCHEME_DB_STRING, SCHEMES_LIST = load_scheme_database()

# --- 2. DATA MODELS ---
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    history: List[ChatMessage] 
    new_message: str           

# --- 3. THE PDF GENERATOR (ReportLab Overlay Method) ---
def generate_filled_pdf(scheme_name: str, extracted_details: dict):
    """Writes Scheme Name, User Data, and Required Docs onto a blank PDF"""
    try:
        # 1. Find the correct template and action text from our DB
        template_name = "default_form.pdf"
        action_text = "Please bring necessary original documents to the center."
        
        for scheme in SCHEMES_LIST:
            if scheme['name'] == scheme_name:
                template_name = scheme['pdf_template']
                action_text = scheme.get('action_required', action_text)
                break
                
        template_path = os.path.join(os.path.dirname(__file__), 'pdf_templates', template_name)
        output_path = os.path.join(os.path.dirname(__file__), 'generated_pdfs', f"filled_{template_name}")

        if not os.path.exists(template_path):
            print(f"⚠️ Blank template {template_name} not found! Please place a blank PDF in the folder.")
            return None 

        # 2. Create the text layer using ReportLab
        packet = BytesIO()
        can = canvas.Canvas(packet, pagesize=letter)
        
        # --- TITLE: Scheme Name ---
        can.setFont("Helvetica-Bold", 16)
        can.drawString(50, 750, f"Application Form: {scheme_name}")
        can.line(50, 740, 550, 740) # Draws a line under the title
        
        # --- SECTION 1: Applicant Details ---
        can.setFont("Helvetica-Bold", 12)
        can.drawString(50, 710, "Applicant Details:")
        
        can.setFont("Helvetica", 12)
        y_position = 680 
        for key, value in extracted_details.items():
            clean_key = key.replace('_', ' ').title()
            can.drawString(70, y_position, f"{clean_key}: {str(value)}")
            y_position -= 30 # Move down for the next line
            
        # --- SECTION 2: Mandatory Documents (Privacy Feature) ---
        y_position -= 20 # Add a little extra space
        can.setFont("Helvetica-Bold", 12)
        can.drawString(50, y_position, "MANDATORY DOCUMENTS TO CARRY TO SEVA KENDRA:")
        
        y_position -= 25
        can.setFont("Helvetica", 11)
        # Print the Hindi/Hinglish action required text directly on the form
        can.drawString(70, y_position, action_text)
            
        can.save()
        packet.seek(0)
        
        # 3. Merge this beautifully formatted text ON TOP of your blank PDF
        new_text_pdf = PdfReader(packet)
        existing_pdf = PdfReader(open(template_path, "rb"))
        output = PdfWriter()
        
        page = existing_pdf.pages[0]
        page.merge_page(new_text_pdf.pages[0])
        output.add_page(page)
        
        # 4. Save the final PDF
        with open(output_path, "wb") as output_stream:
            output.write(output_stream)
            
        print(f"✅ PDF successfully generated with Privacy Instructions at: {output_path}")
        return output_path

    except Exception as e:
        print(f"❌ Error generating PDF: {e}")
        return None

# --- 4. THE SYSTEM PROMPT ---
SAATHI_SYSTEM_PROMPT = f"""
You are 'Aarthi Mitra', an empathetic, WhatsApp-based AI assistant for rural users on the JanSetu platform.
Your job is to listen, show deep empathy, find the right government scheme, and collect details to generate their application PDF.

{SCHEME_DB_STRING}

INSTRUCTIONS:
1. Empathy First: Acknowledge the user's situation warmly.
2. Match Scheme: Based on their problem and keywords, pick the best scheme.
3. Gather Data One by One: Check the "Required Details" for the matched scheme. Ask for missing details ONE at a time.
4. Completion: Once you have ALL required details, set "ready_for_pdf" to true. In your "ai_reply", you MUST include the exact "Action Required (Final Step)" text from the database to tell them which confidential documents to bring physically.

You MUST respond ONLY with a valid JSON object in this exact format:
{{
    "ai_reply": "Your empathetic response (mix Hindi/Hinglish if needed).",
    "matched_scheme": "Exact Name of the scheme from the DB or null",
    "extracted_details": {{
        "field_name": "value"
    }},
    "missing_details": ["list of remaining details needed"],
    "ready_for_pdf": false
}}
"""

@app.post("/api/saathi/chat")
async def process_chat(request: ChatRequest):
    try:
        formatted_messages = [{"role": msg.role, "content": [{"text": msg.content}]} for msg in request.history]
        formatted_messages.append({"role": "user", "content": [{"text": request.new_message}]})

        response = bedrock.converse(
            modelId=MODEL_ID,
            messages=formatted_messages,
            system=[{"text": SAATHI_SYSTEM_PROMPT}],
            inferenceConfig={"maxTokens": 800, "temperature": 0.2}
        )

        # --- UPDATED ROBUST JSON PARSING ---
        raw_reply = response['output']['message']['content'][0]['text']
        
        print(f"\n--- RAW AI RESPONSE ---\n{raw_reply}\n-----------------------\n")
        
        start_idx = raw_reply.find('{')
        end_idx = raw_reply.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            clean_json_str = raw_reply[start_idx:end_idx+1]
            json_reply = json.loads(clean_json_str)
        else:
            json_reply = json.loads(raw_reply)
        
        # --- THE MAGIC HANDOFF ---
        if json_reply.get("ready_for_pdf") == True:
            scheme = json_reply.get("matched_scheme")
            data = json_reply.get("extracted_details", {})
            print(f"🚀 ALL DATA GATHERED! Triggering PDF generation for {scheme}...")
            
            pdf_path = generate_filled_pdf(scheme, data)
            if pdf_path:
                json_reply["pdf_download_url"] = f"/api/download_pdf?filename={os.path.basename(pdf_path)}"

        return json_reply

    except Exception as e:
        print(f"Error calling Bedrock: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat.")


# ==========================================
# --- MODULE 3: MATKA FINANCIAL PLANNER ---
# ==========================================

class FinanceRequest(BaseModel):
    monthly_income: float
    primary_source: str    # e.g., "Farming", "Daily Wage", "Shop"
    family_size: int
    financial_goal: str    # e.g., "Buy a tractor", "Daughter's education"

MATKA_SYSTEM_PROMPT = """
You are 'Aarthi Mitra', a wise and empathetic financial advisor for rural Indians.
Your goal is to take the user's income and divide it using the traditional "Matka" (Earthen Pot) budgeting system.

The 4 Matkas are:
1. Ghar ka Matka (Household & Food) ~ 50%
2. Kaam/Kheti ka Matka (Work/Farming expenses) ~ 20%
3. Bhavishya ka Matka (Savings for their specific goal) ~ 20%
4. Aapatkalin Matka (Emergency fund) ~ 10%

INSTRUCTIONS:
1. Calculate the exact Rupee amount for each Matka based on their income.
2. Provide empathetic, realistic advice tailored to their 'primary_source' and 'financial_goal'.
3. Speak in clear, supportive Hinglish.

You MUST return ONLY a valid JSON object in this exact format:
{
    "ai_advice": "Your empathetic Hinglish advice and encouragement here.",
    "matkas": {
        "ghar_ka_matka": calculated_number,
        "kaam_ka_matka": calculated_number,
        "bhavishya_ka_matka": calculated_number,
        "aapatkalin_matka": calculated_number
    },
    "goal_tips": ["Practical Tip 1", "Practical Tip 2"]
}
"""

@app.post("/api/finance/matka")
async def create_matka_budget(request: FinanceRequest):
    try:
        user_prompt = f"Income: ₹{request.monthly_income}, Source: {request.primary_source}, Family: {request.family_size}, Goal: {request.financial_goal}"
        
        # We don't need history here, just a direct generation based on their profile
        response = bedrock.converse(
            modelId=MODEL_ID,
            messages=[{"role": "user", "content": [{"text": user_prompt}]}],
            system=[{"text": MATKA_SYSTEM_PROMPT}],
            inferenceConfig={"maxTokens": 800, "temperature": 0.3} # Low temperature for accurate math
        )

        raw_reply = response['output']['message']['content'][0]['text']
        print(f"\n--- RAW MATKA RESPONSE ---\n{raw_reply}\n-----------------------\n")
        
        # Robust JSON extraction
        start_idx = raw_reply.find('{')
        end_idx = raw_reply.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            clean_json_str = raw_reply[start_idx:end_idx+1]
            json_reply = json.loads(clean_json_str)
        else:
            json_reply = json.loads(raw_reply)
            
        return json_reply

    except Exception as e:
        print(f"Error calling Bedrock for Matka: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate financial plan.")
# ==========================================
# --- MODULE 2: CURATED SHORTS & QUIZ ---
# ==========================================

class EducationRequest(BaseModel):
    occupation: str 
    language: str = "Hinglish"

# You will replace these dummy links with your actual YouTube Shorts URLs!
CURATED_SHORTS_DB = """
1. Topic: "Mudra Loan - Sahi tareeka loan lene ka" | URL: "https://youtube.com/shorts/5wUyzr_hVC4?si=nUByhlT-kRSA1W6c"
2. Topic: "Fake Loan Apps se saavdhan (Fraud Alert)" | URL: "https://youtube.com/shorts/qwxk247nm1I?si=uRfjM--AOjgQssZ2"
3. Topic: "Bhavishya ke liye bachat (Savings Tips)" | URL: "https://youtube.com/shorts/1gCcNR7IX9c?si=nMoASeP26-ILcuOm"
4. Topic: "PM Fasal Bima - Kheti ka insurance" | URL: "https://youtube.com/shorts/Dxpt7D7ECB8?si=ph7Me49eV1o3kXvL"
5. Topic: "e-Shram Card ke fayde (For unorganized workers)" | URL: "https://youtube.com/shorts/bGkt1FZI5KY?si=PUqImkDTnzdOHEe1"
"""

EDUCATION_SYSTEM_PROMPT = f"""
You are 'Aarthi Mitra', an encouraging educational guide for rural and unorganized sector workers in India.
Your goal is to empower them by providing curated educational Shorts and testing their knowledge.

HERE IS YOUR ONLY ALLOWED VIDEO DATABASE:
{CURATED_SHORTS_DB}

INSTRUCTIONS:
1. Look at the user's 'occupation'.
2. Select EXACTLY 1 or 2 videos from the Database above that are most relevant to them. YOU MUST USE THE EXACT URL PROVIDED IN THE DATABASE. Do not make up links.
3. Create a short 2-question multiple-choice quiz based on the topic of the video(s) you selected to test their practical knowledge.
4. Speak in clear, supportive Hinglish.

You MUST return ONLY a valid JSON object in this exact format:
{{
    "intro_message": "Empathetic Hinglish greeting.",
    "videos": [
        {{
            "title": "Title from database",
            "youtube_url": "Exact URL from database",
            "reason": "Why they should watch this (in Hinglish)"
        }}
    ],
    "quiz": [
        {{
            "question": "Practical multiple-choice question in Hinglish",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "The exact string of the correct option",
            "explanation": "Why this is the correct answer (in Hinglish)"
        }}
    ]
}}
"""

@app.post("/api/education/learn")
async def generate_education_content(request: EducationRequest):
    try:
        user_prompt = f"Occupation: {request.occupation}, Language: {request.language}"
        
        response = bedrock.converse(
            modelId=MODEL_ID,
            messages=[{"role": "user", "content": [{"text": user_prompt}]}],
            system=[{"text": EDUCATION_SYSTEM_PROMPT}],
            inferenceConfig={"maxTokens": 1000, "temperature": 0.3} # Low temperature so it doesn't mess up URLs
        )

        raw_reply = response['output']['message']['content'][0]['text']
        print(f"\n--- RAW EDUCATION RESPONSE ---\n{raw_reply}\n-----------------------\n")
        
        start_idx = raw_reply.find('{')
        end_idx = raw_reply.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            clean_json_str = raw_reply[start_idx:end_idx+1]
            json_reply = json.loads(clean_json_str)
        else:
            json_reply = json.loads(raw_reply)
            
        return json_reply

    except Exception as e:
        print(f"Error calling Bedrock for Education: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate educational content.")