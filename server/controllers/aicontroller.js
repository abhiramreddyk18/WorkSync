import adminmodel from '../models/admin.js';
import employeemodel from '../models/employee.js';
import axios from 'axios';

export const queryAI = async (req, res) => {
    const { message, history } = req.body;
    
    if (!message) {
        return res.status(400).send({ message: "Message is required." });
    }

    try {
        let userProfile = null;
        if (req.body.USER_ROLE === 'admin') {
            userProfile = await adminmodel.findById(req.body.USER_ID);
        } else {
            userProfile = await employeemodel.findById(req.body.USER_ID);
        }

        if (!userProfile) {
            return res.status(401).send({ message: "Authorized profile not found." });
        }

        // Forward payload to Python microservice running on port 5000
        try {
            const pythonResponse = await axios.post('http://127.0.0.1:5000/query', {
                message,
                history: history || [],
                userProfile: {
                    empId: userProfile.empId || '',
                    adminId: userProfile.adminId || '',
                    name: userProfile.name || 'Administrator',
                    shift: userProfile.shift || '',
                    department: userProfile.department || ''
                },
                userRole: req.body.USER_ROLE
            });

            return res.status(200).send({ response: pythonResponse.data.response });
        } catch (axiosError) {
            console.error("Failed to connect to Python AI microservice:", axiosError.message);
            return res.status(200).send({
                response: "🤖 **AI Service Notice**\n\nThe AI Assistant gateway is ready, but the Python AI microservice is currently offline. Please ensure the Python FastAPI microservice is started and running on `http://127.0.0.1:5000`."
            });
        }

    } catch (error) {
        console.error("AI Assistant Controller error:", error);
        return res.status(500).send({ message: "Internal Server Error in AI assistant routing", error: error.message });
    }
};
