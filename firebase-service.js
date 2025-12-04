// firebase-service.js
// Firebase Service Layer for Sucesss Model International Academy

import { 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    orderBy,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

class FirebaseService {
    constructor() {
        this.db = window.db;
        this.auth = window.auth;
        this.SCHOOL_INFO = {
            name: "Sucesss Model International Academy",
            email: "sucesssinternational2021@gmail.com",
            phone: "09020488851",
            address: "NO13 Behind COCIN Church Gura-Landoh Gyel",
            state: "Plateau State",
            country: "Nigeria"
        };
    }

    // ========== AUTHENTICATION ==========
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;
            
            // Store user session
            localStorage.setItem('sucesss_user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                name: user.displayName || 'Finance Officer',
                role: 'admin',
                school: this.SCHOOL_INFO.name
            }));
            
            return { success: true, user: user };
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
            localStorage.removeItem('sucesss_user');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(this.auth, email);
            return { success: true, message: "Password reset email sent" };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getCurrentUser() {
        return new Promise((resolve) => {
            const unsubscribe = this.auth.onAuthStateChanged(user => {
                unsubscribe();
                resolve(user);
            });
        });
    }

    // ========== STUDENT MANAGEMENT ==========
    async addStudent(studentData) {
        try {
            const student = {
                ...studentData,
                admissionNo: this.generateAdmissionNo(),
                fullName: `${studentData.firstName} ${studentData.lastName}`.trim(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                school: this.SCHOOL_INFO.name,
                academicYear: studentData.academicYear || "2023/2024",
                status: "active",
                balance: parseFloat(studentData.balance) || 0
            };

            const docRef = await addDoc(collection(this.db, "students"), student);
            console.log("Student added with ID:", docRef.id);
            
            return { 
                success: true, 
                id: docRef.id, 
                admissionNo: student.admissionNo,
                message: "Student registered successfully" 
            };
        } catch (error) {
            console.error("Error adding student:", error);
            return { success: false, error: error.message };
        }
    }

    async getStudents(filters = {}) {
        try {
            let q = collection(this.db, "students");
            
            // Apply filters
            if (filters.class) {
                q = query(q, where("class", "==", filters.class));
            }
            if (filters.status) {
                q = query(q, where("status", "==", filters.status));
            }
            
            q = query(q, orderBy("createdAt", "desc"));
            
            const querySnapshot = await getDocs(q);
            const students = [];
            querySnapshot.forEach((doc) => {
                students.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data: students };
        } catch (error) {
            console.error("Error getting students:", error);
            return { success: false, error: error.message };
        }
    }

    async updateStudent(studentId, studentData) {
        try {
            const studentRef = doc(this.db, "students", studentId);
            await updateDoc(studentRef, {
                ...studentData,
                updatedAt: serverTimestamp()
            });
            
            return { success: true, message: "Student updated successfully" };
        } catch (error) {
            console.error("Error updating student:", error);
            return { success: false, error: error.message };
        }
    }

    // ========== PAYMENT MANAGEMENT ==========
    async recordPayment(paymentData) {
        try {
            const receiptNo = `SMIA-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
            
            const payment = {
                ...paymentData,
                receiptNo: receiptNo,
                amount: parseFloat(paymentData.amount),
                date: serverTimestamp(),
                recordedBy: JSON.parse(localStorage.getItem('sucesss_user') || '{}').email || 'Unknown',
                status: "completed",
                school: this.SCHOOL_INFO.name,
                academicYear: paymentData.academicYear || "2023/2024",
                term: paymentData.term || "3rd Term"
            };

            // Record payment
            const paymentRef = await addDoc(collection(this.db, "payments"), payment);
            
            // Update student balance if studentId is provided
            if (paymentData.studentId) {
                const studentRef = doc(this.db, "students", paymentData.studentId);
                await updateDoc(studentRef, {
                    lastPaymentDate: serverTimestamp(),
                    lastPaymentAmount: payment.amount,
                    balance: paymentData.newBalance || 0
                });
            }

            return { 
                success: true, 
                id: paymentRef.id, 
                receiptNo: receiptNo,
                amount: payment.amount,
                message: "Payment recorded successfully" 
            };
        } catch (error) {
            console.error("Error recording payment:", error);
            return { success: false, error: error.message };
        }
    }

    async getPayments(filters = {}) {
        try {
            let q = collection(this.db, "payments");
            
            // Apply filters
            if (filters.startDate && filters.endDate) {
                // Note: Date filtering requires proper timestamp queries
            }
            if (filters.paymentMethod) {
                q = query(q, where("paymentMethod", "==", filters.paymentMethod));
            }
            
            q = query(q, orderBy("date", "desc"));
            
            const querySnapshot = await getDocs(q);
            const payments = [];
            querySnapshot.forEach((doc) => {
                payments.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data: payments };
        } catch (error) {
            console.error("Error getting payments:", error);
            return { success: false, error: error.message };
        }
    }

    async getFinancialSummary() {
        try {
            const payments = await this.getPayments();
            if (!payments.success) return payments;
            
            const students = await this.getStudents();
            if (!students.success) return students;
            
            // Calculate totals
            const totalRevenue = payments.data.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const totalStudents = students.data.length;
            
            // Calculate outstanding balances
            const totalOutstanding = students.data.reduce((sum, student) => sum + (student.balance || 0), 0);
            
            // Recent payments (last 30 days logic - simplified)
            const recentPayments = payments.data.slice(0, 10);
            const recentRevenue = recentPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            
            return {
                success: true,
                data: {
                    totalRevenue: totalRevenue,
                    totalStudents: totalStudents,
                    totalOutstanding: totalOutstanding,
                    recentPayments: recentPayments.length,
                    recentRevenue: recentRevenue
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ========== FEE STRUCTURE ==========
    async addFeeItem(feeData) {
        try {
            const feeItem = {
                ...feeData,
                amount: parseFloat(feeData.amount),
                createdAt: serverTimestamp(),
                school: this.SCHOOL_INFO.name,
                academicYear: feeData.academicYear || "2023/2024"
            };

            const docRef = await addDoc(collection(this.db, "fees"), feeItem);
            return { success: true, id: docRef.id, message: "Fee item added successfully" };
        } catch (error) {
            console.error("Error adding fee item:", error);
            return { success: false, error: error.message };
        }
    }

    async getFees() {
        try {
            const q = query(collection(this.db, "fees"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const fees = [];
            querySnapshot.forEach((doc) => {
                fees.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data: fees };
        } catch (error) {
            console.error("Error getting fees:", error);
            return { success: false, error: error.message };
        }
    }

    // ========== UTILITIES ==========
    generateAdmissionNo() {
        const year = new Date().getFullYear().toString().slice(-2);
        const random = Math.floor(1000 + Math.random() * 9000);
        return `SMIA${year}${random}`;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2
        }).format(amount);
    }

    getSchoolInfo() {
        return this.SCHOOL_INFO;
    }

    // Check authentication
    checkAuth() {
        const user = JSON.parse(localStorage.getItem('sucesss_user') || '{}');
        if (!user.email) {
            window.location.href = 'index.html';
            return false;
        }
        return user;
    }
}

// Create global instance
window.firebaseService = new FirebaseService();
