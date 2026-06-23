import os
import datetime
from langchain_openai import ChatOpenAI
from langchain_core.messages import convert_to_messages
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import AgentExecutor, create_tool_calling_agent, create_react_agent

# Import the tools from our separate tools.py module
from tools import (
    get_personal_attendance_stats,
    apply_leave,
    get_attendance_summary,
    get_employee_list,
    check_leave_conflict,
    get_pending_overtime_requests,
    submit_overtime_reason,
    approve_overtime_request
)

# LangChain Generation logic with OpenRouter model and AgentExecutor
def generate_ai_response(user_profile: dict, user_role: str, message: str, history: list, agent_type: str = "tool_calling") -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return "🤖 **AI Service Notice**\n\nThe AI Assistant is ready, but the `OPENROUTER_API_KEY` is not configured in the environment variables."

    # Normalize agent type
    agent_type = (agent_type or "tool_calling").lower()
    if agent_type not in ["tool_calling", "react"]:
        agent_type = "tool_calling"

    # Construct system instructions
    system_content = f"""
You are "WorkSync AI", the official smart virtual assistant for the WorkSync Employee Management Platform.
Your goal is to help employees and administrators manage attendance, schedules, leaves, overtime requests, and analytics.

Current Date: {datetime.date.today().strftime("%A, %d %B %Y")}
Current Time: {datetime.datetime.now().strftime("%I:%M %p")}

User Profile:
- ID: {user_profile.get("empId") or user_profile.get("adminId") or "Admin"}
- Name: {user_profile.get("name") or "Administrator"}
- Role: {user_role}
{f'- Shift: {user_profile.get("shift")}' if user_profile.get("shift") else ''}
{f'- Department: {user_profile.get("department")}' if user_profile.get("department") else ''}

Guidelines:
1. If the user's role is "worker", they only have access to personal stats, leave application, and submitting overtime reasons. They CANNOT view other employees' records, list absentees, check conflicts, approve overtime, or view admin stats. Return a polite authorization error if they ask for unauthorized tasks.
2. Present data clearly using Markdown tables, lists, and bold text. Keep answers professional, concise, and helpful.
3. Overtime requests:
   - Workers can submit the reason for a pending overtime record using the "submit_overtime_reason" tool.
   - Admin/HR/Managers can list all pending overtime requests using "get_pending_overtime_requests", and approve/reject them using "approve_overtime_request".
4. If the user wants to apply for a leave, first help them draft it, or if they provide all details (start date, end date, reason, leave type), call the "apply_leave" tool.
5. If an Admin/HR/Manager asks for scheduling, conflicts, or absentees, utilize the corresponding tools to fetch real database info.
6. When displaying lists of employees, absentees, or overtime requests, always format them as a Markdown table.
"""

    # Parse standard OpenAI history formats directly without any custom loops
    chat_history = convert_to_messages(history)

    # Map of tool names to their LangChain tool objects
    tools_map = {
        "get_personal_attendance_stats": get_personal_attendance_stats,
        "apply_leave": apply_leave,
        "get_attendance_summary": get_attendance_summary,
        "get_employee_list": get_employee_list,
        "check_leave_conflict": check_leave_conflict,
        "get_pending_overtime_requests": get_pending_overtime_requests,
        "submit_overtime_reason": submit_overtime_reason,
        "approve_overtime_request": approve_overtime_request
    }

    # Filter tools based on user roles
    if user_role in ["admin", "hr", "manager"]:
        role_tools = [
            get_personal_attendance_stats,
            apply_leave,
            get_attendance_summary,
            get_employee_list,
            check_leave_conflict,
            get_pending_overtime_requests,
            approve_overtime_request,
            submit_overtime_reason
        ]
    else:
        role_tools = [get_personal_attendance_stats, apply_leave, submit_overtime_reason]

    # Initialize LangChain ChatOpenAI for OpenRouter
    llm = ChatOpenAI(
        model="openrouter/free",
        openai_api_key=api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0.7,
    )

    # Create the agent and agent executor
    try:
        if agent_type == "react":
            react_system_instruction = system_content + """
You must use the following ReAct format to answer the user's question.
You have access to the following tools:

{tools}

To use a tool, use the format:
Thought: Do I need to use a tool? Yes
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action (must be a valid string or dict structure as expected by the tool)
Observation: the result of the action

When you have a final response for the user, or if you do not need any tools to answer, use the format:
Thought: Do I need to use a tool? No
Final Answer: [your response here]

Begin!
"""
            prompt = ChatPromptTemplate.from_messages([
                ("system", react_system_instruction),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}\n\nThought: {agent_scratchpad}"),
            ])
            agent = create_react_agent(llm, role_tools, prompt)
        else:
            # Construct the chat prompt template
            prompt = ChatPromptTemplate.from_messages([
                ("system", "{system_instruction}"),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])
            agent = create_tool_calling_agent(llm, role_tools, prompt)
            
        agent_executor = AgentExecutor(agent=agent, tools=role_tools, handle_parsing_errors=True)
        
        inputs = {
            "chat_history": chat_history,
            "input": message
        }
        if agent_type != "react":
            inputs["system_instruction"] = system_content
            
        response = agent_executor.invoke(inputs)
        return response["output"]
    except Exception as e:
        return f"Error executing agent: {str(e)}"

