import React, { useState } from 'react';

interface LoginPageProps {
    onLogin: (user: string, pass: string) => boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!onLogin(username, password)) {
            setError('Geçersiz kullanıcı adı veya şifre.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center font-sans">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
                <div className="text-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.55a8 8 0 0 1 14.08 0"/>
                        <path d="M1.42 9.5a16 16 0 0 1 21.16 0"/>
                        <path d="M8.53 16.11a4 4 0 0 1 6.95 0"/>
                        <line x1="12" y1="20" x2="12" y2="22"/>
                    </svg>
                    <h2 className="mt-6 text-3xl font-bold text-gray-100">
                        Yönetici Girişi
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        ALS Kontrol Paneline hoş geldiniz
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="username" className="sr-only">Kullanıcı Adı</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-600 bg-gray-900 text-gray-200 placeholder-gray-500 rounded-t-md focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm"
                                placeholder="Kullanıcı Adı (admin)"
                            />
                        </div>
                        <div>
                            <label htmlFor="password-input" className="sr-only">Şifre</label>
                            <input
                                id="password-input"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-600 bg-gray-900 text-gray-200 placeholder-gray-500 rounded-b-md focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm"
                                placeholder="Şifre (admin)"
                            />
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-800 transition-colors"
                        >
                            Giriş Yap
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
