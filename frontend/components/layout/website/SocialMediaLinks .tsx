import React from 'react';
import { Youtube, Instagram } from 'lucide-react';
import { SiGoogle } from 'react-icons/si';

const SocialMediaLinks = () => (
    <section className="py-10 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
                <h3 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                    See What Our Travelers Say
                </h3>
                <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                    Follow our adventures and read honest reviews from our amazing community.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {/* YouTube Link */}
                <a
                    href="https://www.youtube.com/@GETMYGUIDE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                >
                    <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
                                <Youtube className="w-10 h-10 text-white" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-800 mb-2">YouTube</h4>
                            <p className="text-sm text-gray-500 text-center">Watch our travel vlogs</p>
                        </div>
                    </div>
                </a>

                {/* Google Reviews Link */}
                <a
                    href="https://www.google.com/search?q=getyourguide+reviews"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                >
                    <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
                                <SiGoogle className="w-9 h-9 text-white" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-800 mb-2 text-center">Google Reviews</h4>
                            <p className="text-sm text-gray-500 text-center">Read customer reviews</p>
                        </div>
                    </div>
                </a>

                {/* Instagram Link */}
                <a
                    href="https://www.instagram.com/getmyguide.in?igsh=NzFzMTQ0MGRnZmRn&utm_source=ig_contact_invite"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                >
                    <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
                                <Instagram className="w-10 h-10 text-white" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-800 mb-2">Instagram</h4>
                            <p className="text-sm text-gray-500 text-center">Follow our journey</p>
                        </div>
                    </div>
                </a>
            </div>
        </div>
    </section>
);

export default SocialMediaLinks;