import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, BarChart3, TrendingUp, Wallet, CheckCircle, Shield, MoveRight, DollarSignIcon } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import type { Variants } from 'framer-motion';

// Component Imports (Assuming you have a standard shadcn setup)
// If you don't have shadcn, these can be replaced with simple <button> and <div>
import { Button } from '@/components/ui/button'; 

// --- Framer Motion Animation Variants ---

const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
        opacity: 1, 
        y: 0, 
        transition: { 
            duration: 0.8, 
            ease: "easeOut", 
            staggerChildren: 0.2 
        } 
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

// --- Custom Components ---

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
    return (
        <motion.div 
            variants={itemVariants}
            className="p-8 rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <div className="mb-4 text-4xl" style={{ color: 'hsl(140, 70%, 45%)' }}> {/* Soft Green */}
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
            <p className="text-gray-600">{description}</p>
        </motion.div>
    );
};

// Simple Mockup Component for the showcase
const MockupScreen: React.FC<{ title: string; color: string }> = ({ title, color }) => (
    <div 
        className="w-full h-80 rounded-2xl p-4 shadow-2xl relative overflow-hidden" 
        style={{ backgroundColor: color }}
    >
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-900 rounded-full"></div>
        <div className="mt-4 p-4 rounded-xl bg-white/90 h-full flex flex-col justify-center items-center">
            <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
            <BarChart3 className="w-12 h-12 mt-4 text-gray-400" />
            <div className="mt-6 space-y-2 w-full px-4">
                <div className="h-2 bg-indigo-500 rounded-full w-3/4"></div>
                <div className="h-2 bg-yellow-500 rounded-full w-2/3"></div>
            </div>
        </div>
    </div>
);

// --- Main Component ---

const WelcomePage: React.FC = () => {
    // Refs for Framer Motion useInView hook
    const featuresRef = useRef(null);
    const trustRef = useRef(null);
    const inViewFeatures = useInView(featuresRef, { once: true, amount: 0.3 });
    const inViewTrust = useInView(trustRef, { once: true, amount: 0.5 });

    const heroAnimation: Variants = {
        hidden: { opacity: 0, y: -20 },
        visible: { opacity: 1, y: 0, transition: { duration: 1.2, delay: 0.5 } }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans antialiased overflow-x-hidden">
            
            {/* Nav (Simple) */}
            <header className="py-4 px-6 fixed top-0 w-full z-20 backdrop-blur-sm bg-white/80 border-b border-gray-100">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link to="/" className="text-2xl font-black" style={{ color: 'hsl(210, 80%, 30%)' }}>
                        SMARTBUDGET
                    </Link>
                    <Link to="/login">
                        <Button className="bg-white text-gray-800 border-2 border-gray-200 hover:bg-gray-100 font-semibold rounded-xl transition duration-300 shadow-sm">
                            Log In
                        </Button>
                    </Link>
                </div>
            </header>

            <main>
                
                {/* 1. Hero Section */}
                <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-4 bg-white/95 border-b border-gray-100">
                    <motion.div 
                        className="max-w-7xl mx-auto grid md:grid-cols-12 gap-12 items-center"
                        initial="hidden"
                        animate="visible"
                        variants={sectionVariants}
                    >
                        {/* Hero Text */}
                        <motion.div 
                            className="md:col-span-6 text-center md:text-left"
                            variants={itemVariants}
                        >
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight text-gray-900 mb-4">
                                Take Control of Your Money—<span style={{ color: 'hsl(220, 80%, 50%)' }}>Effortlessly.</span>
                            </h1>
                            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl mx-auto md:mx-0">
                                Track expenses, plan budgets, and grow your savings with clarity.
                            </p>
                            
                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                                <Link to="/register">
                                    <Button 
                                        className="w-full sm:w-auto text-lg font-bold h-14 px-8 rounded-2xl shadow-lg transition duration-300"
                                        style={{ backgroundColor: 'hsl(220, 80%, 50%)' }} // Primary Blue
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        Get Started
                                    </Button>
                                </Link>
                                <Button 
                                    variant="outline" 
                                    className="w-full sm:w-auto text-lg font-medium h-14 px-8 rounded-2xl border-2 border-gray-200 hover:bg-gray-50"
                                >
                                    Watch Demo
                                </Button>
                            </div>
                        </motion.div>
                        
                        {/* Hero Illustration (Animated) */}
                        <motion.div 
                            className="md:col-span-6 flex justify-center relative h-80 md:h-96"
                            variants={heroAnimation}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 100, delay: 0.8 }}
                        >
                            {/* Animated Coin */}
                            <motion.div 
                                className="absolute w-20 h-20 rounded-full bg-yellow-400 shadow-2xl flex items-center justify-center text-white"
                                initial={{ y: -50, rotate: 0 }}
                                animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                style={{ top: '10%', left: '10%' }}
                            >
                                <DollarSignIcon className="w-10 h-10" />
                            </motion.div>
                            
                            {/* Animated Chart */}
                            <motion.div 
                                className="absolute p-4 rounded-xl shadow-2xl bg-white"
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 1.5, duration: 0.8 }}
                                style={{ bottom: '10%', right: '5%', width: '40%' }}
                            >
                                <p className="text-sm font-semibold text-gray-800 mb-2">Savings Growth</p>
                                <div className="h-16 w-full flex items-end gap-1">
                                    <motion.div className="w-1/4 bg-green-400 rounded-sm" initial={{ height: 0 }} animate={{ height: "70%" }} transition={{ delay: 1.8, duration: 0.5 }}></motion.div>
                                    <motion.div className="w-1/4 bg-green-500 rounded-sm" initial={{ height: 0 }} animate={{ height: "90%" }} transition={{ delay: 2.0, duration: 0.5 }}></motion.div>
                                    <motion.div className="w-1/4 bg-green-300 rounded-sm" initial={{ height: 0 }} animate={{ height: "50%" }} transition={{ delay: 2.2, duration: 0.5 }}></motion.div>
                                    <motion.div className="w-1/4 bg-green-600 rounded-sm" initial={{ height: 0 }} animate={{ height: "80%" }} transition={{ delay: 2.4, duration: 0.5 }}></motion.div>
                                </div>
                            </motion.div>

                            {/* Main Phone UI */}
                            <div className="w-48 h-80 md:w-56 md:h-96 rounded-[2.5rem] bg-gray-900 shadow-2xl relative border-8 border-gray-800">
                                <div className="absolute inset-0 m-2 rounded-[2rem] bg-white p-4">
                                    <div className="h-full bg-gray-50 rounded-xl flex flex-col justify-center items-center p-3">
                                        <h3 className="text-lg font-bold text-indigo-600">SmartView</h3>
                                        <TrendingUp className="w-12 h-12 my-4 text-green-500" />
                                        <p className="text-sm text-gray-500">Budget on track</p>
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    </motion.div>
                </section>

                {/* 2. Features Section */}
                <motion.section 
                    ref={featuresRef}
                    className="py-20 md:py-32 px-4 max-w-7xl mx-auto"
                    initial="hidden"
                    animate={inViewFeatures ? "visible" : "hidden"}
                    variants={sectionVariants}
                >
                    <motion.h2 
                        className="text-4xl md:text-5xl font-extrabold text-center mb-16 text-gray-900"
                        variants={itemVariants}
                    >
                        Features Designed to Put You Ahead
                    </motion.h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<DollarSignIcon />}
                            title="Savings Automation"
                            description="Set smart rules to automatically transfer spare change and budget surpluses into your high-interest savings."
                        />
                        <FeatureCard
                            icon={<Wallet />}
                            title="Expense Tracking"
                            description="Connect accounts for real-time transaction sync. AI auto-categorizes everything for effortless tracking."
                        />
                        <FeatureCard
                            icon={<BarChart3 />}
                            title="Smart Budget Planning"
                            description="Stop guessing. Our system uses historical data to recommend realistic, achievable budget targets for every category."
                        />
                    </div>
                </motion.section>

                {/* 3. App Showcase Section */}
                <section className="py-20 md:py-28 px-4 bg-gray-50 border-t border-b border-gray-100">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-16 text-gray-900">
                            A Beautiful App, Inside and Out
                        </h2>
                        <div className="grid md:grid-cols-3 gap-12">
                            <MockupScreen title="Expense Overview" color="hsl(240, 50%, 65%)" />
                            <MockupScreen title="Budget Categories" color="hsl(140, 70%, 55%)" />
                            <MockupScreen title="Savings Goals" color="hsl(40, 80%, 60%)" />
                        </div>
                    </div>
                </section>

                {/* 4. Trust Section */}
                <motion.section 
                    ref={trustRef}
                    className="py-20 md:py-28 px-4 max-w-7xl mx-auto"
                    initial="hidden"
                    animate={inViewTrust ? "visible" : "hidden"}
                    variants={sectionVariants}
                >
                    <motion.h2 
                        className="text-4xl font-extrabold text-center mb-12 text-gray-900"
                        variants={itemVariants}
                    >
                        Built on Trust and Security
                    </motion.h2>
                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Security Badges */}
                        <motion.div 
                            className="space-y-6 p-8 rounded-3xl bg-white shadow-lg border border-gray-100"
                            variants={itemVariants}
                        >
                            <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                                <Shield className="w-6 h-6 mr-3 text-red-500" /> Top-Tier Security
                            </h3>
                            <p className="text-gray-600">We use 256-bit AES encryption, multi-factor authentication, and never store your banking credentials. Your data is your business.</p>
                            <ul className="space-y-2 text-gray-700">
                                <li className="flex items-center"><CheckCircle className="w-5 h-5 mr-2 text-green-500" /> SOC 2 Type II Certified</li>
                                <li className="flex items-center"><CheckCircle className="w-5 h-5 mr-2 text-green-500" /> Read-Only Access Only</li>
                                <li className="flex items-center"><CheckCircle className="w-5 h-5 mr-2 text-green-500" /> GDPR & CCPA Compliant</li>
                            </ul>
                        </motion.div>
                        
                        {/* Testimonial */}
                        <motion.div 
                            className="p-8 rounded-3xl bg-white shadow-lg border border-gray-100 flex flex-col justify-between"
                            variants={itemVariants}
                        >
                            <p className="text-xl italic text-gray-800 leading-relaxed">
                                "SmartBudget transformed my finances. The automation is flawless, and I've saved $10,000 more this year than last. Highly recommend!"
                            </p>
                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <p className="font-semibold text-lg text-gray-900">- Sarah L.</p>
                                <p className="text-sm text-gray-500">Verified User, 18 Months</p>
                            </div>
                        </motion.div>
                    </div>
                </motion.section>

                {/* 5. Final CTA Section */}
                <section 
                    className="py-20 md:py-24 px-4 rounded-t-3xl shadow-inner"
                    style={{ background: 'linear-gradient(135deg, hsl(220, 80%, 55%), hsl(240, 70%, 50%))' }}
                >
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
                            Ready to Master Your Money?
                        </h2>
                        <p className="text-xl text-indigo-100 mb-10">
                            Join thousands of happy savers and start your free account today. No credit card required.
                        </p>
                        <Link to="/register">
                            <motion.button 
                                className="text-xl font-extrabold h-16 px-10 rounded-2xl shadow-2xl transition duration-300 flex items-center justify-center mx-auto"
                                style={{ backgroundColor: 'hsl(40, 85%, 60%)', color: 'hsl(220, 80%, 20%)' }} // Primary Yellow
                                whileHover={{ scale: 1.05, boxShadow: '0 10px 15px rgba(0,0,0,0.2)' }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Create Free Account
                                {/* Animated Arrow */}
                                <motion.span
                                    className="ml-3"
                                    animate={{ x: [0, 5, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                >
                                    <MoveRight className="w-6 h-6" />
                                </motion.span>
                            </motion.button>
                        </Link>
                    </div>
                </section>
            </main>
            
            {/* Footer */}
            <footer className="py-8 text-center bg-gray-50 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} SmartBudget. All rights reserved. | <Link to="/privacy" className="hover:underline">Privacy</Link> | <Link to="/terms" className="hover:underline">Terms</Link>
                </p>
            </footer>
        </div>
    );
};

export default WelcomePage;