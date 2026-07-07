import Admin from '../models/admin.model'

export const ForgetPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(404).json({ message: "Email Not Found", success: false })
        }

        const exitsAdmin = await Admin.findOne({ email: email });
        if (!exitsAdmin) {
            return res.status(404).json({ message: "Invalid Email !", success: false });
        }
        if (exitsAdmin.blocked === true) {
            return res.status(400).json({
                message: "You are blocked by your Admin ! Contact to DigiCoder Technologies (P) Ltd",
                success: false
            })
        }

    } catch (error) {

    }
}