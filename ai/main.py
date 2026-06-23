from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import os
from dotenv import load_dotenv

# Load env variables from server directory
load_dotenv(dotenv_path="../server/.env")

api_key = os.getenv("OPENROUTER_API_KEY")

app = FastAPI(title="WorkSync AI Microservice")

class QueryRequest(BaseModel):
    message: str
    history: List[dict] = []
    userProfile: Dict[str, Any]
    userRole: str
    agentType: str = "tool_calling"

@app.post("/query")
async def handle_query(req: QueryRequest):
    if not api_key:
        return {
            "response": "🤖 **AI Service Notice**\n\nThe Python AI Assistant is ready, but the `OPENROUTER_API_KEY` is not configured in the backend environment variables. Please add `OPENROUTER_API_KEY` to the server's `.env` file to activate all AI features."
        }
        
    try:
        from service import generate_ai_response
        agent_type = req.agentType or os.getenv("AGENT_TYPE", "tool_calling")
        response_text = generate_ai_response(
            user_profile=req.userProfile,
            user_role=req.userRole,
            message=req.message,
            history=req.history,
            agent_type=agent_type
        )
        return {"response": response_text}
    except Exception as e:
        print(f"Error handling query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)
