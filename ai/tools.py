import datetime
from bson import ObjectId
from database import employees_col, attendance_col, leaves_col, db
from langchain_core.tools import tool

@tool
def get_personal_attendance_stats(emp_id: str) -> dict:
    """Gets personal attendance metrics, leave balance, overtime, and shift information for the logged-in employee."""
    records = list(attendance_col.find({"empId": emp_id}))
    employee = employees_col.find_one({"empId": emp_id})
    
    total_present = sum(1 for r in records if not r.get("out", False))
    total_late = sum(1 for r in records if r.get("isLate", False))
    total_overtime = sum(r.get("overtimeHours", 0) for r in records)
    
    approved_leaves_count = leaves_col.count_documents({"empId": emp_id, "status": "approved"})
    
    return {
        "empId": emp_id,
        "name": employee.get("name", "Unknown") if employee else "Unknown",
        "shift": employee.get("shift", "Unassigned") if employee else "Unassigned",
        "totalPresent": total_present,
        "totalLate": total_late,
        "totalOvertimeHours": f"{total_overtime:.1f}",
        "approvedLeaves": approved_leaves_count,
        "maxLeavesAllowed": 15,
        "leaveBalance": max(0, 15 - approved_leaves_count)
    }

@tool
def apply_leave(emp_id: str, name: str, start_date: str, end_date: str, leave_type: str, reason: str) -> dict:
    """Submit/apply for a new leave request. Requires emp_id, name, start_date, end_date, leave_type, and reason."""
    start_dt = datetime.datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    end_dt = datetime.datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    
    new_leave = {
        "empId": emp_id,
        "name": name,
        "startDate": start_dt,
        "endDate": end_dt,
        "type": leave_type,
        "reason": reason,
        "status": "pending",
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow()
    }
    result = leaves_col.insert_one(new_leave)
    return {
        "success": True,
        "message": "Leave request submitted successfully as 'pending'.",
        "leaveId": str(result.inserted_id),
        "dates": f"{start_date} to {end_date}",
        "reason": reason
    }

@tool
def get_attendance_summary(date_str: str = None) -> dict:
    """Admin/HR/Manager only: Retrieves the breakdown of present, absent, and on-leave employees for a specific date (YYYY-MM-DD format)."""
    if not date_str:
        target_date = datetime.datetime.utcnow().date()
    else:
        target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        
    start_time = datetime.datetime.combine(target_date, datetime.time.min)
    end_time = datetime.datetime.combine(target_date, datetime.time.max)
    
    checkins = list(attendance_col.find({"InTime": {"$gte": start_time, "$lte": end_time}}))
    checked_in_ids = [c["empId"] for c in checkins]
    
    all_employees = list(employees_col.find({"isActive": True}))
    
    leaves_today = list(leaves_col.find({
        "status": "approved",
        "startDate": {"$lte": end_time},
        "endDate": {"$gte": start_time}
    }))
    leave_emp_map = {l["empId"]: l for l in leaves_today}
    
    present_list = []
    absent_list = []
    leave_list = []
    
    for emp in all_employees:
        emp_id = emp["empId"]
        if emp_id in checked_in_ids:
            present_list.append(emp)
        elif emp_id in leave_emp_map:
            l = leave_emp_map[emp_id]
            leave_list.append({
                "name": emp["name"],
                "empId": emp_id,
                "role": emp.get("role", "worker"),
                "shift": emp.get("shift", "Unassigned"),
                "leaveType": l.get("type", "casual"),
                "reason": l.get("reason", "")
            })
        else:
            absent_list.append(emp)
            
    return {
        "date": target_date.isoformat(),
        "totalEmployees": len(all_employees),
        "presentCount": len(present_list),
        "absentCount": len(absent_list),
        "leaveCount": len(leave_list),
        "absentees": [{"name": e["name"], "empId": e["empId"], "role": e.get("role", "worker")} for e in absent_list],
        "leaves": leave_list
    }

@tool
def get_employee_list() -> list:
    """Admin/HR/Manager only: Returns a list of all active employees registered in the system."""
    employees = list(employees_col.find({"isActive": True}))
    return [
        {
            "name": e["name"],
            "empId": e["empId"],
            "email": e["email"],
            "role": e.get("role", "worker"),
            "shift": e.get("shift", "None")
        }
        for e in employees
    ]

@tool
def check_leave_conflict(date_str: str) -> dict:
    """Admin/HR/Manager only: Checks if a specific date (YYYY-MM-DD) has approved leaves that cause shift capacity warnings or staffing shortages."""
    summary = get_attendance_summary.func(date_str)
    
    shifts_count = {"morning": 0, "evening": 0, "night": 0}
    on_leave_shifts = {"morning": 0, "evening": 0, "night": 0}
    
    active_employees = list(employees_col.find({"isActive": True}))
    for emp in active_employees:
        shift = emp.get("shift")
        if shift in shifts_count:
            shifts_count[shift] += 1
            
    for leave in summary["leaves"]:
        shift = leave.get("shift")
        if shift in on_leave_shifts:
            on_leave_shifts[shift] += 1
            
    conflicts = []
    for shift, total in shifts_count.items():
        on_leave = on_leave_shifts.get(shift, 0)
        active = total - on_leave
        if total > 0 and active <= 1:
            conflicts.append({
                "shift": shift,
                "warning": f"Critical understaffing: Only {active} worker(s) active on the {shift} shift (Total: {total}, On Leave: {on_leave})."
            })
            
    return {
        "date": date_str,
        "totalLeavesToday": summary["leaveCount"],
        "leaveDetails": [{"name": l["name"], "type": l["leaveType"], "shift": l["shift"]} for l in summary["leaves"]],
        "conflicts": conflicts
    }

@tool
def get_pending_overtime_requests() -> list:
    """Admin/HR/Manager only: Retrieves a list of all pending overtime requests from employees."""
    records = list(attendance_col.find({"overtimeStatus": "pending"}))
    result = []
    for r in records:
        result.append({
            "attendanceId": str(r["_id"]),
            "empId": r.get("empId"),
            "name": r.get("name"),
            "shift": r.get("shift", "None"),
            "inTime": r["InTime"].isoformat() if r.get("InTime") else None,
            "outTime": r["OutTime"].isoformat() if r.get("OutTime") else None,
            "hours": r.get("hours", 0),
            "pendingOvertimeHours": r.get("pendingOvertimeHours", 0),
            "overtimeReason": r.get("overtimeReason", ""),
            "overtimeStatus": r.get("overtimeStatus", "pending")
        })
    return result

@tool
def submit_overtime_reason(attendance_id: str, reason: str) -> dict:
    """Submit the reason explaining why you worked overtime for a specific attendance record. Requires attendance_id and reason."""
    try:
        record = attendance_col.find_one({"_id": ObjectId(attendance_id)})
        if not record:
            return {"success": False, "message": "Attendance record not found."}
        
        if record.get("overtimeStatus") != "pending":
            return {"success": False, "message": f"Overtime status is '{record.get('overtimeStatus')}', not pending."}
        
        attendance_col.update_one(
            {"_id": ObjectId(attendance_id)},
            {"$set": {"overtimeReason": reason}}
        )
        return {"success": True, "message": "Overtime reason submitted successfully."}
    except Exception as e:
        return {"success": False, "message": f"Error: {str(e)}"}

@tool
def approve_overtime_request(attendance_id: str, status: str, approved_hours: float = None) -> dict:
    """Admin/HR/Manager only: Approve or reject an employee's pending overtime request.
    Args:
        attendance_id: The ID of the attendance record.
        status: The approval decision. Must be 'approved' or 'rejected'.
        approved_hours: Optional. The number of overtime hours to approve. Defaults to the full pending overtime hours.
    """
    if status not in ["approved", "rejected"]:
        return {"success": False, "message": "Status must be 'approved' or 'rejected'."}
    
    try:
        record = attendance_col.find_one({"_id": ObjectId(attendance_id)})
        if not record:
            return {"success": False, "message": "Attendance record not found."}
        
        if record.get("overtimeStatus") != "pending":
            return {"success": False, "message": f"Record is not in pending state (Current status: '{record.get('overtimeStatus')}')."}
            
        employee = employees_col.find_one({"empId": record.get("empId")})
        if not employee:
            return {"success": False, "message": "Employee profile associated with the record was not found."}
            
        if status == "rejected":
            attendance_col.update_one(
                {"_id": ObjectId(attendance_id)},
                {"$set": {"overtimeStatus": "rejected", "approvedOvertimeHours": 0}}
            )
            return {"success": True, "message": "Overtime request has been rejected."}
            
        # status == "approved"
        pending_hours = record.get("pendingOvertimeHours", 0)
        hours_to_approve = approved_hours if approved_hours is not None else pending_hours
        
        if hours_to_approve <= 0 or hours_to_approve > pending_hours:
            return {"success": False, "message": f"Approved hours must be between 0 and pending hours ({pending_hours})."}
            
        # Get multiplier
        multiplier = 1.5
        shift_name = record.get("shift")
        if shift_name:
            shift_config = db["shifts"].find_one({"name": shift_name})
            if shift_config:
                multiplier = shift_config.get("overtimeMultiplier", 1.5)
                
        overtime_pay = hours_to_approve * employee.get("hourlyRate", 100) * multiplier
        
        # Update attendance record
        attendance_col.update_one(
            {"_id": ObjectId(attendance_id)},
            {
                "$set": {
                    "overtimeHours": hours_to_approve,
                    "approvedOvertimeHours": hours_to_approve,
                    "overtimeStatus": "approved",
                },
                "$inc": {
                    "payment": overtime_pay
                }
            }
        )
        
        # Update employee totals
        employees_col.update_one(
            {"empId": record.get("empId")},
            {
                "$inc": {
                    "totalWorkHours": hours_to_approve,
                    "overtimeHours": hours_to_approve,
                    "salary": overtime_pay
                }
            }
        )
        
        return {
            "success": True,
            "message": f"Overtime request approved for {hours_to_approve} hours. Payment of {overtime_pay:.2f} credited to employee balance.",
            "approvedHours": hours_to_approve,
            "payment": overtime_pay
        }
    except Exception as e:
        return {"success": False, "message": f"Error: {str(e)}"}
