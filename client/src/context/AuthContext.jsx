import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Simple hash function using Web Crypto API
const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Helper to get stored users
const getStoredUsers = () => {
    try {
        return JSON.parse(localStorage.getItem('registered_users') || '[]');
    } catch {
        return [];
    }
};

// Helper to save users
const saveUsers = (users) => {
    localStorage.setItem('registered_users', JSON.stringify(users));
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on mount
        const session = localStorage.getItem('current_session');
        if (session) {
            try {
                setUser(JSON.parse(session));
            } catch {
                localStorage.removeItem('current_session');
            }
        }
        setLoading(false);
    }, []);

    const signup = async (name, email, password) => {
        const users = getStoredUsers();

        // Check if email already exists
        const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
            return { success: false, message: 'An account with this email already exists. Please login instead.' };
        }

        // Hash password and store user
        const hashedPassword = await hashPassword(password);
        const newUser = {
            id: Date.now().toString(),
            name: name,
            email: email.toLowerCase(),
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users);

        // Auto-login after signup
        const sessionUser = { id: newUser.id, name: newUser.name, email: newUser.email };
        localStorage.setItem('current_session', JSON.stringify(sessionUser));
        setUser(sessionUser);

        return { success: true };
    };

    const login = async (email, password) => {
        const users = getStoredUsers();
        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!foundUser) {
            return { success: false, message: 'No account found with this email. Please sign up first.' };
        }

        const hashedPassword = await hashPassword(password);
        if (foundUser.password !== hashedPassword) {
            return { success: false, message: 'Incorrect password. Please try again.' };
        }

        // Set session
        const sessionUser = { id: foundUser.id, name: foundUser.name, email: foundUser.email };
        localStorage.setItem('current_session', JSON.stringify(sessionUser));
        setUser(sessionUser);

        return { success: true };
    };

    const logout = () => {
        localStorage.removeItem('current_session');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, signup, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
