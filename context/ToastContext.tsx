import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import SuccessToast, { ToastType } from '../components/SuccessToast';

interface ToastContextType {
    show: (message: string, options?: { title?: string; type?: ToastType }) => void;
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<{
        message: string;
        title?: string;
        type: ToastType;
        visible: boolean;
    } | null>(null);

    const show = useCallback((message: string, options: { title?: string; type?: ToastType } = {}) => {
        const { title, type = 'success' } = options;
        setToast({ message, title, type, visible: true });
    }, []);

    const success = useCallback((message: string, title?: string) => {
        show(message, { title, type: 'success' });
    }, [show]);

    const error = useCallback((message: string, title?: string) => {
        show(message, { title, type: 'error' });
    }, [show]);

    const info = useCallback((message: string, title?: string) => {
        show(message, { title, type: 'info' });
    }, [show]);

    const warning = useCallback((message: string, title?: string) => {
        show(message, { title, type: 'warning' });
    }, [show]);

    const hide = useCallback(() => {
        setToast(prev => prev ? { ...prev, visible: false } : null);
    }, []);

    return (
        <ToastContext.Provider value={{ show, success, error, info, warning }}>
            {children}
            {toast?.visible && (
                <SuccessToast
                    message={toast.message}
                    title={toast.title}
                    type={toast.type}
                    onHide={hide}
                />
            )}
        </ToastContext.Provider>
    );
};

export const useCustomToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useCustomToast must be used within a ToastProvider');
    }
    return context;
};
