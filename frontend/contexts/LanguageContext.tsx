"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const supportedLanguages = ["en", "es", "fr", "ru", "de"] as const;

export type LanguageCode = (typeof supportedLanguages)[number];

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLanguage = localStorage.getItem("language");
      if (
        savedLanguage &&
        (supportedLanguages as readonly string[]).includes(savedLanguage)
      ) {
        setLanguageState(savedLanguage as LanguageCode);
      }
    }
  }, []);

  const setLanguage = useCallback((newLanguage: LanguageCode) => {
    setLanguageState(newLanguage);
    if (typeof window !== "undefined") {
      localStorage.setItem("language", newLanguage);
    }
  }, []);

  const t = useCallback(
    (
      key: string,
      replacements?: { [key: string]: string | number },
    ): string => {
      const translations: Record<LanguageCode, Record<string, string>> = {
        // ================================= ENGLISH =================================
        en: {
          // Header
          nav_home: "Home",
          nav_about: "About",
          nav_tours: "Services",
          nav_find_guides: "Book a Certified Guide",
          // nav_all_guides : "Guides Available",
          nav_become_guide: "Register Certified Guide",
          nav_guide_availability: "Guide Availability",
          nav_how_it_works: "How it Works",
          nav_contact: "Contact",
          nav_blog: "Blog",
          profile_welcome: "Welcome!",
          profile_signin_prompt: "Sign in to access your account",
          profile_login: "Login",
          profile_register: "Register",
          profile_dashboard: "Dashboard",
          profile_logout: "Logout",
          profile_logging_out: "Logging out...",
          mobile_language_label: "Language",

          // Hero Carousel
          hero_title_taj:
            "We are Committed to Boosting Tourism in India Through www.getmyguide.in",
          hero_subtitle_taj:
            "Experience the epitome of Mughal architecture with expert guides",
          hero_category_taj: "Heritage Tours",
          hero_title_rajasthan:
            "We are Committed to Boosting Tourism in India Through www.getmyguide.in",
          hero_subtitle_rajasthan:
            "Wander through the majestic forts and palaces of Jaisalmer",
          hero_category_rajasthan: "Desert Adventures",
          hero_title_kerala:
            "We are Committed to Boosting Tourism in India Through www.getmyguide.in",
          hero_subtitle_kerala:
            "Cruise through serene waters and lush green landscapes",
          hero_category_kerala: "Nature & Wildlife",
          hero_title_varanasi:
            "We are Committed to Boosting Tourism in India Through www.getmyguide.in",
          hero_subtitle_varanasi:
            "Witness ancient rituals along the sacred Ganges River",
          hero_category_varanasi: "Spiritual Tours",
          hero_title_himalayas:
            "We are Committed to Boosting Tourism in India Through www.getmyguide.in",
          hero_subtitle_himalayas:
            "Adventure through breathtaking mountain landscapes",
          hero_category_himalayas: "Adventure Tours",
          hero_title_goa:
            "We are Committed to Boosting Tourism in India Through www.getmyguide.in",
          hero_subtitle_goa:
            "Discover pristine beaches and vibrant Portuguese heritage",
          hero_category_goa: "Beach & Culture",
          tours_available: "Tours Available",
          expert_guides: "Expert Guides",
          average_rating: "Average Rating",
          book_your_tour_now: "Book Your Tour Now",
          become_a_guide: "Become a Guide",
          verified_guides: "Verified Guides",
          secure_payments: "Secure Payments",
          support_24_7: "24/7 Support",

          footer_quick_links: "Footer Quick Link",
          footer_contact_details: "Footer Contact Details",
          footer_payment_methods: "Secure Payment Methods",

          // Tour Categories
          explore_tour_categories: "Explore Our Tour Categories",
          explore_tour_categories_desc:
            "Choose from our carefully curated selection of authentic experiences, each led by certified local experts who know their craft inside out.",
          available_in_languages: "Available in 10+ Languages",
          per_person: "per person",
          add_to_cart: "Add to Cart",
          view_tours: "View Tours",
          looking_for_something_specific: "Looking for Something Specific?",
          custom_tour_prompt:
            "Can't find the perfect tour? Our guides can create custom experiences tailored to your interests.",
          request_custom_tour: "Request Custom Tour",

          // Guide Registration
          join_our_network: "Join Our Network",
          become_certified_guide: "Register as a Certified Guide",
          guide_reg_desc:
            "Join our exclusive network of professional guides and share your passion for your local culture while earning a sustainable income.",
          benefit_title_1: "Earn Premium Income",
          benefit_desc_1: "Top guides earn $200-500 per day with our platform",
          benefit_title_2: "Verified & Trusted",
          benefit_desc_2: "Complete verification process builds client trust",
          benefit_title_3: "Global Reach",
          benefit_desc_3: "Connect with travelers from around the world",
          benefit_title_4: "Professional Growth",
          benefit_desc_4: "Access training and certification programs",
          start_application: "Start Application",
          guide_requirements_title: "Guide Requirements",
          req_1: "Valid government ID and local residence proof",
          req_2: "Minimum 2 years of guiding experience",
          req_3: "Fluency in English + local language",
          req_4: "First aid certification (we can help arrange)",
          req_5: "Clean background check",
          req_6: "Professional references from previous clients",
          app_process_title: "Application Process",
          app_step_1: "1. Submit online application (5 minutes)",
          app_step_2: "2. Document verification (2-3 days)",
          app_step_3: "3. Video interview with our team",
          app_step_4: "4. Background check completion",
          app_step_5: "5. Welcome to GetMyGuide family!",

          // Booking Process
          booking_proc_title: "Simple Booking Process",
          booking_proc_desc:
            "Book your perfect tour experience in just a few clicks. Our streamlined process ensures you get the best guide for your needs.",
          step_1_title: "Choose Your Experience",
          step_1_desc:
            "Browse our curated selection of tours and select your preferred guide",
          step_1_details: "Filter by location, language, price, and tour type",
          step_2_title: "Select Date & Time",
          step_2_desc:
            "Pick your preferred date and check real-time availability",
          step_2_details: "Flexible scheduling with instant confirmation",
          step_3_title: "Secure Payment",
          step_3_desc: "Pay safely with our encrypted payment system",
          step_3_details: "Only 20-30% advance payment required",
          step_4_title: "Confirmation & Meet",
          step_4_desc: "Receive confirmation and meet your certified guide",
          step_4_details: "Get guide contact details and meeting point",
          feature_1_title: "4.9/5 Average Rating",
          feature_1_desc: "Based on 10,000+ verified reviews",
          feature_2_title: "Local Expertise",
          feature_2_desc: "All guides are locals with deep cultural knowledge",
          feature_3_title: "100% Verified",
          feature_3_desc: "Every guide passes our strict verification process",

          // Testimonials
          testimonials_title_community: "Hear From Our Community",
          testimonials_desc:
            "Real stories from travelers who explored India with our expert guides.",
          no_testimonials: "No testimonials available at the moment.",
          stat_happy_travelers: "Happy Travelers",
          stat_total_reviews: "Total Reviews",
          stat_expert_guides: "Expert Guides",
          stat_avg_rating: "Average Rating",
          video_unavailable: "Video unavailable",

          // About Page Sections
          about_platform_title: "About",
          about_platform_p1:
            "GetMyGuide.in is a unified digital platform that connects certified linguistic tour guides from across India with international travellers and inbound tour groups.",
          about_platform_p2:
            "Our mission is to empower India's tour guides, enhance the visitor experience, and promote authentic, responsible, and transparent tourism.",
          about_platform_p3:
            "We bring together a network of qualified guides who have passed government certification programs and hold state or pan-India licenses. Through our platform, Foreign travellers can directly choose and connect with guides who match their language, expertise, and itinerary needs.",
          about_stat_guides: "Certified Guides",
          about_stat_cities: "Cities Covered",
          about_card_gov: "Government",
          about_card_cert: "Certified",
          about_card_lic: "Licensed & Verified",
          aims_header: "Our Goals",
          aims_title: "Aims & Objectives",
          aims_p1:
            "Our strategic objectives guide every decision we make, ensuring we create meaningful impact for guides, travelers, and the tourism industry.",
          aims_obj_1:
            "To create a transparent and direct employment system for India's licensed tour guides",
          aims_obj_2:
            "To promote Indian tourism globally through professional and linguistic expertise",
          aims_obj_3:
            "To enhance visitor satisfaction through authentic and well-guided experiences",
          aims_obj_4:
            "To ensure that guides receive fair and timely payments, without intermediaries",
          aims_obj_5:
            "To contribute to India's tourism economy by empowering certified professionals",
          gt_header: "Special Focus",
          gt_title: "Our Special Focus — The Golden Triangle",
          gt_p1:
            "The Golden Triangle — Delhi, Agra, and Jaipur — represents the heart of India's tourism experience, covering some of the nation's most iconic World Heritage Sites such as the Taj Mahal, Qutub Minar, Amber Fort, and Red Fort in Agra.",
          gt_p2:
            "At GetMyGuide.in, we specialize in offering the best professional guides for this region. Whether you're exploring Delhi's Mughal architecture, Agra's timeless love story, or Jaipur's royal heritage — our guides ensure you experience these wonders with comfort, clarity, and cultural depth.",
          gt_stat_cities: "Iconic Cities",
          gt_stat_exp: "Experiences",
          gt_overlay_title: "The Golden Triangle",
          gt_overlay_feat1: "Heritage Sites",
          gt_overlay_feat2: "Photo Spots",
          mission_vision_header: "Our Purpose",
          mission_vision_title: "Mission & Vision Statement",
          mission_title: "Mission",
          mission_p:
            "To connect travellers from around the world with certified, multilingual Indian tour guides — ensuring every journey through India is safe, insightful, and unforgettable.",
          vision_title: "Vision",
          vision_p:
            "To become India's most trusted online platform for professional tour guide bookings, uplifting the status of licensed guides while redefining the global travel experience through authenticity and transparency.",
          why_choose_header: "Why Choose Us",
          why_choose_title: "Why Choose or Sign Up on GetMyGuide.in",
          reason_1_title: "Direct Access",
          reason_1_desc:
            "Connect directly with licensed guides — no agencies or brokers involved.",
          reason_2_title: "Fair Pricing",
          reason_2_desc:
            "Pay directly to the guide as per government-approved standards.",
          reason_3_title: "Linguistic Expertise",
          reason_3_desc:
            "Choose from guides who speak your language — English, French, German, Japanese, Spanish, Italian, Chinese, and more.",
          reason_4_title: "All-in-One Travel Support",
          reason_4_desc:
            "Customize your entire trip — guides, hotels, taxis, and tour assistants — on one platform.",
          reason_5_title: "Free YouTube Memory Video",
          reason_5_desc:
            "Get a complimentary travel video as part of your tour.",
          reason_6_title: "Verified Professionals",
          reason_6_desc:
            "Every guide is government-approved and background-verified for your peace of mind.",
          reason_7_title: "Authentic Experience",
          reason_7_desc:
            "Travel with confidence and enjoy India the way it's meant to be — real, cultural, and unforgettable.",
          reason_8_title: "Expert Knowledge",
          reason_8_desc:
            "Benefit from guides with deep expertise in their regions and cultural heritage.",
          why_guide_header: "Certified Excellence",
          why_guide_title: "Why Hiring a Registered Guide Is Necessary",
          why_guide_p:
            "Discover why choosing certified, government-approved guides ensures the highest quality travel experience across India.",
          why_guide_reason_1_title: "Government Authorization",
          why_guide_reason_1_desc:
            "Every guide registered on our platform is licensed by the Government of India and has successfully cleared the official examinations to become a certified linguistic tour guide.",
          why_guide_reason_2_title: "Language Expertise",
          why_guide_reason_2_desc:
            "Our guides speak multiple foreign languages fluently, ensuring smooth communication for visitors from all parts of the world.",
          why_guide_reason_3_title: "Safety & Trust",
          why_guide_reason_3_desc:
            "Authorized guides ensure that tourists are protected from fraud, misinformation, or unsafe travel arrangements.",
          why_guide_reason_4_title: "Cultural Accuracy",
          why_guide_reason_4_desc:
            "Licensed guides provide genuine historical and cultural insights, giving travellers the true story behind every monument and tradition.",
          why_guide_reason_5_title: "Transparency",
          why_guide_reason_5_desc:
            "Payments go directly from client to guide — no middlemen, no hidden costs.",
          yt_header: "Memory Feature",
          yt_title: "Our YouTube Memory Feature",
          yt_p1:
            "To make your journey unforgettable, we offer a complimentary video memory service.",
          yt_p2:
            "During your tour, your guide can capture short clips and highlights of your travel experience, which will later be edited and uploaded as a YouTube link — allowing you to:",
          yt_feat_1: "Relive your trip anytime, anywhere",
          yt_feat_2: "Share it easily with your loved ones",
          yt_feat_3: "Preserve your travel story forever",
          yt_p3:
            "This service is our way of adding a personal touch to your incredible Indian journey.",
          yt_overlay_title: "Complimentary Video Service",

          // Footer
          footer_company_subtitle: "Professional Tourism",
          footer_company_description:
            "Connecting travelers with certified local guides for authentic, safe, and memorable experiences worldwide. Your adventure starts here.",
          footer_available_languages: "Available in 15+ languages",
          footer_tour_types: "Tour Types",
          footer_destinations: "Popular Destinations",
          footer_support: "Support & Policies",
          footer_stay_updated: "Stay Updated",
          footer_newsletter_prompt: "Get the latest tours and exclusive offers",
          footer_email_placeholder: "Enter your email",
          footer_subscribe: "Subscribe",
          footer_copyright: "© 2024 GetMyGuide. All rights reserved.",
          footer_legal_links:
            "Privacy Policy | Terms of Service | Cookie Policy",

          help_center: "Help Center",
          safety_guidelines: "Safety Guidelines",
          privacy_policy: "Privacy Policy",
          refund_and_cancellation: "Refund and Cancellation",
          terms_and_conditions: "Terms and Conditions",
          guide_verification: "Guide Verification",
          customer_support: "Customer Support",

          // ================================= TOURS PAGE =================================
          tours_badge: "Explore Tours",
          tours_title: "Discover India's Hidden Gems",
          tours_desc:
            "Browse curated experiences led by verified local guides and uncover the heart of every destination.",
          tours_search_placeholder: "Search by name or description...",
          tours_filter_placeholder: "Filter by Location",
          tours_all_locations: "All Locations",
          tours_failed_title: "Failed to Load Tours",
          tours_not_found_title: "No Tours Found",
          tours_not_found_desc: "Try adjusting your search or filters.",

          // ================================= FIND GUIDES PAGE =================================
          find_guides_badge: "Explore with Experts",
          find_guides_title: "Find Your Perfect Local Guide",
          find_guides_desc:
            "Select a location and language to connect with our certified, professional tour guides.",
          find_guides_card_title: "Search Your Guide",
          find_guides_card_desc:
            "Start by selecting your desired destination and language.",
          find_guides_destination_label: "Destination",
          find_guides_destination_placeholder: "Select a location",
          find_guides_language_label: "Language",
          find_guides_language_placeholder: "Select a language",
          find_guides_button: "Find Guides",
          find_guides_error_title: "Error Loading Guides",
          find_guides_try_again: "Try Again",
          find_guides_results_title: "Meet Your Expert Guides",
          find_guides_not_found_title: "No Guides Found",
          find_guides_not_found_desc:
            "Unfortunately, no guides match your selected criteria. Please try a different combination.",
          find_guides_new_search: "Start a New Search",
          find_guides_book_button: "View & Book",
          // ================================= BECOME A GUIDE PAGE =================================
          guide_page_badge: "Join Our Network",
          guide_page_title: "Registration for authorised Tour Guides",
          guide_page_desc:
            "Empower travelers with your local knowledge and earn while sharing your city’s unique stories.",
          guide_page_why_join: "Why Join BookMyTourGuide?",
          guide_page_benefit_1_title: "Earn ₹500-2000/hour",
          guide_page_benefit_1_desc:
            "Set your own rates and earn competitive income.",
          guide_page_benefit_2_title: "Flexible Schedule",
          guide_page_benefit_2_desc:
            "Work when you want, and choose your own tours.",
          guide_page_benefit_3_title: "Professional Growth",
          guide_page_benefit_3_desc:
            "Build your reputation and expand your network.",
          guide_page_benefit_4_title: "Verified Platform",
          guide_page_benefit_4_desc:
            "Join our trusted community of certified guides.",
          guide_page_requirements_title: "Our Requirements",
          guide_page_what_we_look_for: "What We Look For",
          guide_page_req_1: "Valid government-issued ID proof",
          guide_page_req_2: "Minimum 2 years of guiding experience",
          guide_page_req_3:
            "Fluency in English and at least one local language",
          guide_page_req_4: "Deep knowledge of local history and culture",
          guide_page_req_5: "A professional and friendly attitude",
          guide_page_req_6: "A smartphone with internet access",
          guide_page_verification_title: "Our Verification Process",
          guide_page_step_1:
            "Submit an online application with your documents.",
          guide_page_step_2:
            "Our team conducts a background check and a brief online interview.",
          guide_page_step_3:
            "Complete our platform training and get certified.",
          guide_page_step_4:
            "Activate your profile and start receiving tour bookings!",
          guide_page_cta_title: "Ready to Guide Your Next Adventure?",
          guide_page_cta_desc:
            "Start your journey as a professional guide today. Click the button below to begin the registration process and join a passionate community.",
          guide_page_cta_button: "All Verified Guides Can Register",
          // ================================= HOW IT WORKS PAGE =================================
          how_badge: "How It Works",
          how_title: "Simple Steps to Plan Your Perfect Trip",
          how_desc:
            "From choosing a guide to booking your next adventure — discover how easy it is to travel with GetMyGuide.",
          how_section_1_title: "Book Your Perfect Tour in 4 Easy Steps",
          how_step_1_title: "Search & Browse",
          how_step_1_desc:
            "Browse our curated selection of tours and guides based on your interests, location, and dates.",
          how_step_1_detail_1: "Filter by tour and location",
          how_step_1_detail_2: "Read guide profiles",
          how_step_1_detail_3: "View detailed itineraries",
          how_step_1_detail_4: "Check availability in real-time",
          how_step_2_title: "Choose Your Guide",
          how_step_2_desc:
            "Select from our verified local guides who match your preferences and tour requirements.",
          how_step_2_detail_1: "All guides are background verified",
          how_step_2_detail_2: "View ratings and authentic reviews",
          how_step_2_detail_3: "Check language preferences",
          how_step_2_detail_4: "See specialization areas",
          how_step_3_title: "Secure Booking",
          how_step_3_desc:
            "Book your tour with a small advance payment. Pay the remaining amount after tour completion.",
          how_step_3_detail_1: "Pay only 20-30% advance",
          how_step_3_detail_2: "Secure payment gateway",
          how_step_3_detail_3: "Instant booking confirmation",
          how_step_3_detail_4: "Free cancellation up to 24 hours",
          how_step_4_title: "Enjoy Your Tour",
          how_step_4_desc:
            "Meet your guide at the designated location and embark on your authentic Indian adventure.",
          how_step_4_detail_1: "GPS tracking for safety",
          how_step_4_detail_2: "24/7 emergency support",
          how_step_4_detail_3: "Flexible tour customization",
          how_step_4_detail_4: "Professional guide service",
          how_payment_title: "Transparent Payment Process",
          how_payment_step_1_title: "Advance Payment",
          how_payment_step_1_desc: "Pay 20-30% to confirm booking",
          how_payment_step_1_amount: "₹500-1000",
          how_payment_step_1_timing: "At booking",
          how_payment_step_2_title: "Tour Completion",
          how_payment_step_2_desc: "Enjoy your tour experience",
          how_payment_step_2_amount: "Experience",
          how_payment_step_2_timing: "During tour",
          how_payment_step_3_title: "Final Payment",
          how_payment_step_3_desc: "Pay remaining amount to guide",
          how_payment_step_3_amount: "₹1500-3000",
          how_payment_step_3_timing: "Before 24hrs of tour",
          how_payment_step_4_title: "Review & Rate",
          how_payment_step_4_desc: "Share your experience",
          how_payment_step_4_amount: "Feedback",
          how_payment_step_4_timing: "Post tour",
          how_payment_footer:
            "Secure payments • No hidden charges • Full refund on cancellation",
          how_safety_title: "Your Safety is Our Priority",
          how_safety_feat_1_title: "Verified Guides",
          how_safety_feat_1_desc:
            "Background checks, ID verification, and professional training",
          how_safety_feat_2_title: "24/7 Support",
          how_safety_feat_2_desc:
            "Emergency helpline available throughout your tour",
          how_safety_feat_3_title: "GPS Tracking",
          how_safety_feat_3_desc:
            "Real-time location sharing for added security",
          how_safety_feat_4_title: "Quality Assurance",
          how_safety_feat_4_desc: "Regular monitoring and feedback system",
          how_for_guides_title: "Certified Guide Curated Journey",
          how_guide_step_1_title: "Application",
          how_guide_step_1_desc:
            "Submit your profile and documents for verification",
          how_guide_step_2_title: "Verification",
          how_guide_step_2_desc:
            "Background check, interview, and document validation",
          how_guide_step_3_title: "Training",
          how_guide_step_3_desc: "Complete our guide certification program",
          how_guide_step_4_title: "Go Live",
          how_guide_step_4_desc: "Start receiving bookings and earning money",
          how_for_guides_button: "Apply to Become a Guide",
          how_faq_title: "Frequently Asked Questions",
          how_faq_travelers: "For Travelers",
          how_faq_q1: "Can I cancel my booking?",
          how_faq_a1: "Yes, free cancellation up to 24 hours before the tour.",
          how_faq_q2: "Are guides verified?",
          how_faq_a2: "All guides undergo background checks and certification.",
          how_faq_q3: "What if I need help during the tour?",
          how_faq_a3: "24/7 emergency support is available via phone.",
          how_faq_guides: "For Guides",
          how_faq_q4: "How much can I earn?",
          how_faq_a4: "₹500-2000 per hour based on experience and tour type.",
          how_faq_q5: "When do I get paid?",
          how_faq_a5:
            "Payment is received directly from travelers after tour completion.",
          how_faq_q6: "Can I set my own schedule?",
          how_faq_a6: "Yes, you have full control over your availability.",
          how_cta_title: "Ready to Start Your Journey?",
          how_cta_desc:
            "Join thousands of travelers who have discovered authentic India through our platform.",
          how_cta_button1: "Book Your First Tour",
          how_cta_button2: "Explore All Tours",
          // ================================= CONTACT PAGE =================================
          contact_badge: "Contact Us",
          contact_title: "We’re Here to Help You Explore",
          contact_desc:
            "Have questions or feedback? Reach out and let’s make your travel experience seamless.",
          contact_info_phone_title: "Phone Support",
          contact_info_phone_desc: "Available 24/7 for emergencies",
          contact_info_email_title: "Email Support",
          contact_info_email_desc: "Response within 2-4 hours",
          contact_info_office_title: "Head Office",
          contact_info_office_desc: "Visit us Mon-Fri, 9 AM - 6 PM",
          contact_info_hours_title: "Business Hours",
          contact_info_hours_desc: "India Standard Time (IST)",
          contact_form_section_title: "Send us a Message",
          contact_form_card_title: "Contact Form",
          contact_form_card_desc:
            "Fill out the form below and we'll get back to you within 24 hours",
          contact_form_success_title: "Message Sent!",
          contact_form_success_desc:
            "Thank you for contacting us. We'll respond shortly.",
          contact_form_error_title: "Error",
          contact_form_name_label: "Full Name *",
          contact_form_name_placeholder: "Your full name",
          contact_form_phone_label: "Phone Number *",
          contact_form_phone_placeholder: "+91 9876543210",
          contact_form_email_label: "Email Address *",
          contact_form_email_placeholder: "your.email@example.com",
          contact_form_category_label: "Category *",
          contact_form_category_placeholder: "Select inquiry type",
          contact_form_cat_booking: "Tour Booking",
          contact_form_cat_guide: "Become a Guide",
          contact_form_cat_support: "Technical Support",
          contact_form_cat_partnership: "Partnership",
          contact_form_cat_feedback: "Feedback",
          contact_form_cat_other: "Other",
          contact_form_subject_label: "Subject *",
          contact_form_subject_placeholder: "Brief subject of your inquiry",
          contact_form_message_label: "Message *",
          contact_form_message_placeholder:
            "Please provide details about your inquiry...",
          contact_form_sending: "Sending...",
          contact_form_send_button: "Message to customise your tour",
          contact_faq_section_title: "Frequently Asked Questions",
          contact_faq_cat_travelers: "For Travelers",
          contact_form_nationality_label: "Nationality",
          contact_form_nationality_placeholder: "Your nationality",
          contact_faq_q1: "How do I book a tour?",
          contact_faq_q2: "What's included in the tour price?",
          contact_faq_q3: "Can I cancel or reschedule?",
          contact_faq_q4: "How are guides verified?",
          contact_faq_cat_guides: "For Guides",
          contact_faq_q5: "How do I become a guide?",
          contact_faq_q6: "What are the requirements?",
          contact_faq_q7: "How do I get paid?",
          contact_faq_q8: "How do I update my profile?",
          contact_faq_cat_general: "General Support",
          contact_faq_q9: "Technical issues with website",
          contact_faq_q10: "Payment problems",
          contact_faq_q11: "Account management",
          contact_faq_q12: "Safety concerns",
          contact_faq_view_all: "View All FAQs",
          contact_map_section_title: "Visit Our Office",
          contact_map_office_name: "GetMyGuide Head Office",
          contact_map_get_directions: "Get Directions",
        },

        // ================================= SPANISH =================================
        es: {
          nav_home: "Inicio",
          nav_about: "Sobre Nosotros",
          nav_tours: "Tours",
          nav_find_guides: "Reservar Guía",
          nav_become_guide: "Ser Guía",
          nav_guide_availability: "Disponibilidad de Guías",
          nav_how_it_works: "Cómo Funciona",
          nav_contact: "Contacto",
          nav_blog: "Blog",
          profile_welcome: "¡Bienvenido!",
          profile_signin_prompt: "Inicia sesión",
          profile_login: "Iniciar Sesión",
          profile_register: "Registrarse",
          profile_dashboard: "Panel",
          profile_logout: "Cerrar Sesión",
          profile_logging_out: "Cerrando sesión...",
          mobile_language_label: "Idioma",
          hero_title_taj: "Descubre el Taj Mahal",
          hero_subtitle_taj:
            "Experimenta la arquitectura mogol con guías expertos",
          hero_category_taj: "Tours de Patrimonio",
          hero_title_rajasthan: "Explora la Ciudad Dorada de Rajastán",
          hero_subtitle_rajasthan:
            "Pasea por los majestuosos fuertes y palacios de Jaisalmer",
          hero_category_rajasthan: "Aventuras en el Desierto",
          hero_title_kerala: "Paraíso de Remansos de Kerala",
          hero_subtitle_kerala: "Navega por aguas serenas y paisajes verdes",
          hero_category_kerala: "Naturaleza y Vida Silvestre",
          hero_title_varanasi: "Viaje Espiritual de Varanasi",
          hero_subtitle_varanasi:
            "Observa antiguos rituales en el sagrado río Ganges",
          hero_category_varanasi: "Tours Espirituales",
          hero_title_himalayas: "Treks en el Himalaya",
          hero_subtitle_himalayas:
            "Aventúrate por paisajes montañosos impresionantes",
          hero_category_himalayas: "Tours de Aventura",
          hero_title_goa: "Encanto Costero de Goa",
          hero_subtitle_goa:
            "Descubre playas vírgenes y la herencia portuguesa",
          hero_category_goa: "Playa y Cultura",
          tours_available: "Tours Disponibles",
          expert_guides: "Guías Expertos",
          average_rating: "Calificación Promedio",
          book_your_tour_now: "Reserva tu Tour Ahora",
          become_a_guide: "Conviértete en Guía",
          verified_guides: "Guías Verificados",
          secure_payments: "Pagos Seguros",
          support_24_7: "Soporte 24/7",

          footer_quick_links: "Enlaces Rápidos",
          footer_contact_details: "Detalles de Contacto",
          footer_payment_methods: "Métodos de Pago Seguros",

          explore_tour_categories: "Explora Nuestras Categorías de Tours",
          explore_tour_categories_desc:
            "Elige entre nuestras experiencias auténticas, dirigidas por expertos locales certificados.",
          available_in_languages: "Disponible en +10 idiomas",
          per_person: "por persona",
          add_to_cart: "Añadir al Carrito",
          view_tours: "Ver Tours",
          looking_for_something_specific: "¿Buscas Algo Específico?",
          custom_tour_prompt:
            "¿No encuentras el tour perfecto? Nuestros guías pueden crear experiencias personalizadas.",
          request_custom_tour: "Solicitar Tour Personalizado",
          join_our_network: "Únete a Nuestra Red",
          become_certified_guide: "Conviértete en Guía Certificado",
          guide_reg_desc:
            "Únete a nuestra exclusiva red de guías profesionales y comparte tu pasión por tu cultura local mientras ganas un ingreso sostenible.",
          benefit_title_1: "Gana Ingresos Premium",
          benefit_desc_1:
            "Los mejores guías ganan $200-500 por día con nuestra plataforma",
          benefit_title_2: "Verificado y de Confianza",
          benefit_desc_2:
            "El proceso de verificación completo genera confianza en el cliente",
          benefit_title_3: "Alcance Global",
          benefit_desc_3: "Conecta con viajeros de todo el mundo",
          benefit_title_4: "Crecimiento Profesional",
          benefit_desc_4: "Accede a programas de formación y certificación",
          start_application: "Iniciar Solicitud",
          guide_requirements_title: "Requisitos para Guías",
          req_1: "ID gubernamental válido y prueba de residencia local",
          req_2: "Mínimo 2 años de experiencia como guía",
          req_3: "Fluidez en inglés + idioma local",
          req_4:
            "Certificación de primeros auxilios (podemos ayudar a gestionarla)",
          req_5: "Verificación de antecedentes limpia",
          req_6: "Referencias profesionales de clientes anteriores",
          app_process_title: "Proceso de Solicitud",
          app_step_1: "1. Enviar solicitud en línea (5 minutos)",
          app_step_2: "2. Verificación de documentos (2-3 días)",
          app_step_3: "3. Entrevista por video con nuestro equipo",
          app_step_4: "4. Finalización de la verificación de antecedentes",
          app_step_5: "5. ¡Bienvenido a la familia BookMyTourGuide!",
          booking_proc_title: "Proceso de Reserva Sencillo",
          booking_proc_desc:
            "Reserva tu experiencia de tour perfecta en solo unos pocos clics. Nuestro proceso optimizado asegura que obtengas el mejor guía para tus necesidades.",
          step_1_title: "Elige tu Experiencia",
          step_1_desc:
            "Navega por nuestra selección de tours y elige tu guía preferido",
          step_1_details: "Filtra por ubicación, idioma, precio y tipo de tour",
          step_2_title: "Selecciona Fecha y Hora",
          step_2_desc:
            "Elige tu fecha preferida y comprueba la disponibilidad en tiempo real",
          step_2_details: "Programación flexible con confirmación instantánea",
          step_3_title: "Pago Seguro",
          step_3_desc:
            "Paga de forma segura con nuestro sistema de pago encriptado",
          step_3_details: "Solo se requiere un pago por adelantado del 20-30%",
          step_4_title: "Confirmación y Encuentro",
          step_4_desc: "Recibe la confirmación y conoce a tu guía certificado",
          step_4_details:
            "Obtén los datos de contacto del guía y el punto de encuentro",
          feature_1_title: "4.9/5 Calificación Promedio",
          feature_1_desc: "Basado en más de 10,000 reseñas verificadas",
          feature_2_title: "Experiencia Local",
          feature_2_desc:
            "Todos los guías son locales con un profundo conocimiento cultural",
          feature_3_title: "100% Verificado",
          feature_3_desc:
            "Cada guía pasa nuestro estricto proceso de verificación",
          testimonials_title_community: "Testimonios de Nuestra Comunidad",
          testimonials_desc:
            "Historias reales de viajeros que exploraron la India con nuestros guías expertos.",
          no_testimonials: "No hay testimonios disponibles en este momento.",
          stat_happy_travelers: "Viajeros Felices",
          stat_total_reviews: "Reseñas Totales",
          stat_expert_guides: "Guías Expertos",
          stat_avg_rating: "Calificación Promedio",
          video_unavailable: "Video no disponible",
          footer_company_subtitle: "Turismo Profesional",
          footer_company_description:
            "Conectando viajeros con guías locales certificados para experiencias auténticas, seguras y memorables.",
          footer_available_languages: "Disponible en +15 idiomas",
          footer_tour_types: "Tipos de Tour",
          footer_destinations: "Destinos Populares",
          footer_support: "Soporte y Políticas",
          footer_stay_updated: "Mantente Actualizado",
          footer_newsletter_prompt:
            "Recibe los últimos tours y ofertas exclusivas",
          footer_email_placeholder: "Ingresa tu correo electrónico",
          footer_subscribe: "Suscribir",
          footer_copyright:
            "© 2024 BookMyTourGuide. Todos los derechos reservados.",
          footer_legal_links:
            "Política de Privacidad | Términos de Servicio | Política de Cookies",

          help_center: "Centro de Ayuda",
          safety_guidelines: "Pautas de Seguridad",
          privacy_policy: "Política de Privacidad",
          refund_and_cancellation: "Reembolso y Cancelación",
          terms_and_conditions: "Términos y Condiciones",
          guide_verification: "Verificación de Guía",
          customer_support: "Atención al Cliente",

          about_platform_title: "Sobre",
          about_platform_p1:
            "IndiaTourManager.com es una plataforma digital unificada que conecta guías turísticos lingüísticos certificados de toda la India con viajeros internacionales.",
          about_platform_p2:
            "Nuestra misión es empoderar a los guías turísticos de la India, mejorar la experiencia del visitante y promover un turismo auténtico, responsable y transparente.",
          about_platform_p3:
            "Reunimos una red de guías calificados que han superado los programas de certificación del gobierno. A través de nuestra plataforma, los viajeros extranjeros pueden elegir y conectarse directamente con guías que coincidan con su idioma y necesidades.",
          about_stat_guides: "Guías Certificados",
          about_stat_cities: "Ciudades Cubiertas",
          about_card_gov: "Gobierno",
          about_card_cert: "Certificado",
          about_card_lic: "Licenciado y Verificado",
          aims_header: "Nuestras Metas",
          aims_title: "Metas y Objetivos",
          aims_p1:
            "Nuestros objetivos estratégicos guían cada decisión que tomamos, asegurando un impacto significativo para los guías, los viajeros y la industria del turismo.",
          aims_obj_1:
            "Crear un sistema de empleo transparente y directo para los guías turísticos con licencia de la India",
          aims_obj_2:
            "Promover el turismo indio a nivel mundial a través de la experiencia profesional y lingüística",
          aims_obj_3:
            "Mejorar la satisfacción del visitante a través de experiencias auténticas y bien guiadas",
          aims_obj_4:
            "Asegurar que los guías reciban pagos justos y puntuales, sin intermediarios",
          aims_obj_5:
            "Contribuir a la economía turística de la India empoderando a profesionales certificados",
          gt_header: "Foco Especial",
          gt_title: "Nuestro Foco Especial — El Triángulo Dorado",
          gt_p1:
            "El Triángulo Dorado — Delhi, Agra y Jaipur — representa el corazón de la experiencia turística de la India, cubriendo algunos de los sitios del Patrimonio Mundial más emblemáticos del país como el Taj Mahal y el Fuerte de Amber.",
          gt_p2:
            "En IndiaTourManager.com, nos especializamos en ofrecer los mejores guías profesionales para esta región. Nuestros guías se aseguran de que experimentes estas maravillas con comodidad, claridad y profundidad cultural.",
          gt_stat_cities: "Ciudades Icónicas",
          gt_stat_exp: "Experiencias",
          gt_overlay_title: "El Triángulo Dorado",
          gt_overlay_feat1: "Sitios Patrimoniales",
          gt_overlay_feat2: "Puntos Fotográficos",
          mission_vision_header: "Nuestro Propósito",
          mission_vision_title: "Declaración de Misión y Visión",
          mission_title: "Misión",
          mission_p:
            "Conectar a viajeros de todo el mundo con guías turísticos indios certificados y multilingües, asegurando que cada viaje por la India sea seguro, perspicaz e inolvidable.",
          vision_title: "Visión",
          vision_p:
            "Convertirnos en la plataforma en línea más confiable de la India para reservas de guías turísticos profesionales, elevando el estatus de los guías con licencia mientras redefinimos la experiencia de viaje global a través de la autenticidad y la transparencia.",
          why_choose_header: "Por Qué Elegirnos",
          why_choose_title:
            "Por Qué Elegir o Registrarse en IndiaTourManager.com",
          reason_1_title: "Acceso Directo",
          reason_1_desc:
            "Conéctate directamente con guías licenciados, sin agencias ni intermediarios.",
          reason_2_title: "Precios Justos",
          reason_2_desc:
            "Paga directamente al guía según las tarifas aprobadas por el gobierno.",
          reason_3_title: "Experiencia Lingüística",
          reason_3_desc:
            "Elige guías que hablen tu idioma: inglés, francés, alemán, japonés, español y más.",
          reason_4_title: "Soporte de Viaje Todo en Uno",
          reason_4_desc:
            "Personaliza todo tu viaje — guías, hoteles, taxis — en una plataforma.",
          reason_5_title: "Video de Recuerdo Gratis en YouTube",
          reason_5_desc:
            "Obtén un video de viaje de cortesía como parte de tu tour.",
          reason_6_title: "Profesionales Verificados",
          reason_6_desc:
            "Cada guía está aprobado por el gobierno y verificado para tu tranquilidad.",
          reason_7_title: "Experiencia Auténtica",
          reason_7_desc:
            "Viaja con confianza y disfruta de la India de la manera que debe ser: real y cultural.",
          reason_8_title: "Conocimiento Experto",
          reason_8_desc:
            "Benefíciate de guías con profundo conocimiento de sus regiones y patrimonio cultural.",
          why_guide_header: "Excelencia Certificada",
          why_guide_title: "Por Qué es Necesario Contratar un Guía Registrado",
          why_guide_p:
            "Descubre por qué elegir guías certificados y aprobados por el gobierno garantiza la más alta calidad en tu experiencia de viaje por la India.",
          why_guide_reason_1_title: "Autorización Gubernamental",
          why_guide_reason_1_desc:
            "Cada guía en nuestra plataforma tiene licencia del Gobierno de la India y ha superado los exámenes oficiales.",
          why_guide_reason_2_title: "Experiencia Lingüística",
          why_guide_reason_2_desc:
            "Nuestros guías hablan varios idiomas extranjeros con fluidez, asegurando una comunicación fluida.",
          why_guide_reason_3_title: "Seguridad y Confianza",
          why_guide_reason_3_desc:
            "Los guías autorizados protegen a los turistas de fraudes y arreglos de viaje inseguros.",
          why_guide_reason_4_title: "Precisión Cultural",
          why_guide_reason_4_desc:
            "Los guías licenciados proporcionan información histórica y cultural genuina.",
          why_guide_reason_5_title: "Transparencia",
          why_guide_reason_5_desc:
            "Los pagos van directamente del cliente al guía, sin intermediarios ni costos ocultos.",
          yt_header: "Función de Recuerdo",
          yt_title: "Nuestra Función de Recuerdo de YouTube",
          yt_p1:
            "Para que tu viaje sea inolvidable, ofrecemos un servicio gratuito de video de recuerdo.",
          yt_p2:
            "Durante tu recorrido, tu guía puede capturar clips y momentos destacados de tu experiencia, que luego se editarán y subirán como un enlace de YouTube, permitiéndote:",
          yt_feat_1: "Revive tu viaje en cualquier momento y lugar",
          yt_feat_2: "Compártelo fácilmente con tus seres queridos",
          yt_feat_3: "Conserva tu historia de viaje para siempre",
          yt_p3:
            "Este servicio es nuestra forma de agregar un toque personal a tu increíble viaje por la India.",
          yt_overlay_title: "Servicio de Video Gratuito",
          // ================================= TOURS PAGE =================================
          tours_badge: "Explorar Tours",
          tours_title: "Descubre las Joyas Ocultas de la India",
          tours_desc:
            "Navega por experiencias curadas dirigidas por guías locales verificados y descubre el corazón de cada destino.",
          tours_search_placeholder: "Buscar por nombre o descripción...",
          tours_filter_placeholder: "Filtrar por Ubicación",
          tours_all_locations: "Todas las Ubicaciones",
          tours_failed_title: "Error al Cargar los Tours",
          tours_not_found_title: "No se Encontraron Tours",
          tours_not_found_desc: "Intenta ajustar tu búsqueda o filtros.",

          // ================================= FIND GUIDES PAGE =================================
          find_guides_badge: "Explora con Expertos",
          find_guides_title: "Encuentra tu Guía Local Perfecto",
          find_guides_desc:
            "Selecciona una ubicación y un idioma para conectar con nuestros guías turísticos profesionales y certificados.",
          find_guides_card_title: "Descubre tu Guía",
          find_guides_card_desc:
            "Comienza seleccionando tu destino e idioma deseados.",
          find_guides_destination_label: "Destino",
          find_guides_destination_placeholder: "Selecciona una ubicación",
          find_guides_language_label: "Idioma",
          find_guides_language_placeholder: "Selecciona un idioma",
          find_guides_button: "Encontrar Guías",
          find_guides_error_title: "Error al Cargar Guías",
          find_guides_try_again: "Intentar de Nuevo",
          find_guides_results_title: "Conoce a tus Guías Expertos",
          find_guides_not_found_title: "No se Encontraron Guías",
          find_guides_not_found_desc:
            "Lamentablemente, ningún guía coincide con los criterios seleccionados. Por favor, intenta una combinación diferente.",
          find_guides_new_search: "Iniciar una Nueva Búsqueda",
          find_guides_book_button: "Ver y Reservar",
          // ================================= BECOME A GUIDE PAGE =================================
          guide_page_badge: "Únete a Nuestra Red",
          guide_page_title: "Conviértete en Socio de BookMyTourGuide",
          guide_page_desc:
            "Empodera a los viajeros con tu conocimiento local y gana mientras compartes las historias únicas de tu ciudad.",
          guide_page_why_join: "¿Por Qué Unirte a BookMyTourGuide?",
          guide_page_benefit_1_title: "Gana ₹500-2000/hora",
          guide_page_benefit_1_desc:
            "Establece tus propias tarifas y obtén ingresos competitivos.",
          guide_page_benefit_2_title: "Horario Flexible",
          guide_page_benefit_2_desc:
            "Trabaja cuando quieras y elige tus propios tours.",
          guide_page_benefit_3_title: "Crecimiento Profesional",
          guide_page_benefit_3_desc:
            "Construye tu reputación y expande tu red.",
          guide_page_benefit_4_title: "Plataforma Verificada",
          guide_page_benefit_4_desc:
            "Únete a nuestra comunidad de confianza de guías certificados.",
          guide_page_requirements_title: "Nuestros Requisitos",
          guide_page_what_we_look_for: "Lo Que Buscamos",
          guide_page_req_1:
            "Prueba de identificación válida emitida por el gobierno",
          guide_page_req_2: "Mínimo 2 años de experiencia como guía",
          guide_page_req_3: "Fluidez en inglés y al menos un idioma local",
          guide_page_req_4:
            "Conocimiento profundo de la historia y cultura local",
          guide_page_req_5: "Una actitud profesional y amigable",
          guide_page_req_6: "Un smartphone con acceso a internet",
          guide_page_verification_title: "Nuestro Proceso de Verificación",
          guide_page_step_1: "Envía una solicitud en línea con tus documentos.",
          guide_page_step_2:
            "Nuestro equipo realiza una verificación de antecedentes y una breve entrevista en línea.",
          guide_page_step_3:
            "Completa nuestra capacitación de la plataforma y obtén la certificación.",
          guide_page_step_4:
            "¡Activa tu perfil y comienza a recibir reservas de tours!",
          guide_page_cta_title: "¿Listo para Guiar tu Próxima Aventura?",
          guide_page_cta_desc:
            "Comienza tu viaje como guía profesional hoy. Haz clic en el botón de abajo para iniciar el proceso de registro y unirte a una comunidad apasionada.",
          guide_page_cta_button:
            "Conviértete en un Guía Turístico Certificado y Verificado",
          // Spanish
          how_badge: "Cómo Funciona",
          how_title: "Pasos Sencillos para Planificar tu Viaje Perfecto",
          how_desc:
            "Desde elegir un guía hasta reservar tu próxima aventura — descubre lo fácil que es viajar con BookMyTourGuide.",
          how_section_1_title: "Reserva tu Tour Perfecto en 4 Sencillos Pasos",
          how_step_1_title: "Busca y Explora",
          how_step_1_desc:
            "Explora nuestra selección de tours y guías según tus intereses, ubicación y fechas.",
          how_step_1_detail_1: "Filtra por tipo de tour, ubicación y precio",
          how_step_1_detail_2: "Lee perfiles y reseñas de guías",
          how_step_1_detail_3: "Ver itinerarios detallados",
          how_step_1_detail_4: "Comprueba la disponibilidad en tiempo real",
          how_step_2_title: "Elige tu Guía",
          how_step_2_desc:
            "Selecciona entre nuestros guías locales verificados que coincidan con tus preferencias.",
          how_step_2_detail_1:
            "Todos los guías tienen antecedentes verificados",
          how_step_2_detail_2: "Ver calificaciones y reseñas auténticas",
          how_step_2_detail_3: "Comprobar preferencias de idioma",
          how_step_2_detail_4: "Ver áreas de especialización",
          how_step_3_title: "Reserva Segura",
          how_step_3_desc:
            "Reserva tu tour con un pequeño pago por adelantado. Paga el resto después del tour.",
          how_step_3_detail_1: "Paga solo un 20-30% por adelantado",
          how_step_3_detail_2: "Pasarela de pago segura",
          how_step_3_detail_3: "Confirmación de reserva instantánea",
          how_step_3_detail_4: "Cancelación gratuita hasta 24 horas antes",
          how_step_4_title: "Disfruta tu Tour",
          how_step_4_desc:
            "Encuentra a tu guía en el lugar designado y comienza tu auténtica aventura india.",
          how_step_4_detail_1: "Seguimiento por GPS para mayor seguridad",
          how_step_4_detail_2: "Soporte de emergencia 24/7",
          how_step_4_detail_3: "Personalización flexible del tour",
          how_step_4_detail_4: "Servicio de guía profesional",
          how_payment_title: "Proceso de Pago Transparente",
          how_payment_step_1_title: "Pago Adelantado",
          how_payment_step_1_desc: "Paga 20-30% para confirmar la reserva",
          how_payment_step_1_timing: "Al reservar",
          how_payment_step_2_title: "Finalización del Tour",
          how_payment_step_2_desc: "Disfruta de tu experiencia en el tour",
          how_payment_step_2_amount: "Experiencia",
          how_payment_step_2_timing: "Durante el tour",
          how_payment_step_3_title: "Pago Final",
          how_payment_step_3_desc: "Paga el monto restante al guía",
          how_payment_step_3_timing: "Después del tour",
          how_payment_step_4_title: "Opina y Califica",
          how_payment_step_4_desc: "Comparte tu experiencia",
          how_payment_step_4_amount: "Opinión",
          how_payment_step_4_timing: "Post-tour",
          how_payment_footer:
            "Pagos seguros • Sin cargos ocultos • Reembolso completo por cancelación",
          how_safety_title: "Tu Seguridad es Nuestra Prioridad",
          how_safety_feat_1_title: "Guías Verificados",
          how_safety_feat_1_desc:
            "Verificación de antecedentes, de identidad y formación profesional",
          how_safety_feat_2_title: "Soporte 24/7",
          how_safety_feat_2_desc:
            "Línea de ayuda de emergencia disponible durante todo el tour",
          how_safety_feat_3_title: "Seguimiento por GPS",
          how_safety_feat_3_desc:
            "Ubicación en tiempo real compartida para mayor seguridad",
          how_safety_feat_4_title: "Garantía de Calidad",
          how_safety_feat_4_desc:
            "Sistema de seguimiento y retroalimentación regular",
          how_for_guides_title: "¿Quieres Ser Guía?",
          how_guide_step_1_title: "Solicitud",
          how_guide_step_1_desc:
            "Envía tu perfil y documentos para verificación",
          how_guide_step_2_title: "Verificación",
          how_guide_step_2_desc:
            "Verificación de antecedentes, entrevista y validación de documentos",
          how_guide_step_3_title: "Formación",
          how_guide_step_3_desc:
            "Completa nuestro programa de certificación de guías",
          how_guide_step_4_title: "¡En Línea!",
          how_guide_step_4_desc: "Comienza a recibir reservas y a ganar dinero",
          how_for_guides_button: "Aplica para ser Guía",
          how_faq_title: "Preguntas Frecuentes",
          how_faq_travelers: "Para Viajeros",
          how_faq_q1: "¿Puedo cancelar mi reserva?",
          how_faq_a1: "Sí, cancelación gratuita hasta 24 horas antes del tour.",
          how_faq_q2: "¿Los guías están verificados?",
          how_faq_a2:
            "Todos los guías pasan por verificaciones de antecedentes y certificación.",
          how_faq_q3: "¿Y si necesito ayuda durante el tour?",
          how_faq_a3:
            "El soporte de emergencia 24/7 está disponible por teléfono.",
          how_faq_guides: "Para Guías",
          how_faq_q4: "¿Cuánto puedo ganar?",
          how_faq_a4:
            "500-2000 ₹ por hora según la experiencia y el tipo de tour.",
          how_faq_q5: "¿Cuándo me pagan?",
          how_faq_a5:
            "El pago se recibe directamente de los viajeros después de completar el tour.",
          how_faq_q6: "¿Puedo establecer mi propio horario?",
          how_faq_a6: "Sí, tienes control total sobre tu disponibilidad.",
          how_cta_title: "¿Listo para Empezar tu Viaje?",
          how_cta_desc:
            "Únete a miles de viajeros que han descubierto la auténtica India a través de nuestra plataforma.",
          how_cta_button1: "Reserva tu Primer Tour",
          how_cta_button2: "Explora Todos los Tours",
          // ================================= CONTACT PAGE =================================
          contact_badge: "Contáctanos",
          contact_title: "Estamos aquí para ayudarte a explorar",
          contact_desc:
            "¿Tienes preguntas o comentarios? Contáctanos y haremos que tu experiencia de viaje sea perfecta.",
          contact_info_phone_title: "Soporte Telefónico",
          contact_info_phone_desc: "Disponible 24/7 para emergencias",
          contact_info_email_title: "Soporte por Correo Electrónico",
          contact_info_email_desc: "Respuesta en 2-4 horas",
          contact_info_office_title: "Oficina Principal",
          contact_info_office_desc: "Visítanos de Lunes a Viernes, 9 AM - 6 PM",
          contact_info_hours_title: "Horario de Atención",
          contact_info_hours_desc: "Hora Estándar de la India (IST)",
          contact_form_section_title: "Envíanos un Mensaje",
          contact_form_card_title: "Formulario de Contacto",
          contact_form_card_desc:
            "Rellena el formulario y te responderemos en 24 horas",
          contact_form_success_title: "¡Mensaje Enviado!",
          contact_form_success_desc:
            "Gracias por contactarnos. Te responderemos en breve.",
          contact_form_error_title: "Error",
          contact_form_name_label: "Nombre Completo *",
          contact_form_name_placeholder: "Tu nombre completo",
          contact_form_phone_label: "Número de Teléfono *",
          contact_form_category_placeholder: "Selecciona el tipo de consulta",
          contact_form_cat_booking: "Reserva de Tour",
          contact_form_cat_guide: "Convertirse en Guía",
          contact_form_cat_support: "Soporte Técnico",
          contact_form_cat_partnership: "Asociación",
          contact_form_cat_feedback: "Comentarios",
          contact_form_cat_other: "Otro",
          contact_form_subject_label: "Asunto *",
          contact_form_subject_placeholder: "Breve asunto de tu consulta",
          contact_form_message_label: "Mensaje *",
          contact_form_message_placeholder:
            "Por favor, proporciona detalles sobre tu consulta...",
          contact_form_sending: "Enviando...",
          contact_form_send_button: "Enviar Mensaje",
          contact_faq_section_title: "Preguntas Frecuentes",
          contact_form_nationality_label: "nacionalidad",
          contact_form_nationality_placeholder: "tu nacionalidad",
          contact_faq_cat_travelers: "Para Viajeros",
          contact_faq_q1: "¿Cómo reservo un tour?",
          contact_faq_q2: "¿Qué incluye el precio del tour?",
          contact_faq_q3: "¿Puedo cancelar o reprogramar?",
          contact_faq_q4: "¿Cómo se verifican los guías?",
          contact_faq_cat_guides: "Para Guías",
          contact_faq_q5: "¿Cómo me convierto en guía?",
          contact_faq_q6: "¿Cuáles son los requisitos?",
          contact_faq_q7: "¿Cómo me pagan?",
          contact_faq_q8: "¿Cómo actualizo mi perfil?",
          contact_faq_cat_general: "Soporte General",
          contact_faq_q9: "Problemas técnicos con el sitio web",
          contact_faq_q10: "Problemas de pago",
          contact_faq_q11: "Gestión de cuenta",
          contact_faq_q12: "Preocupaciones de seguridad",
          contact_faq_view_all: "Ver Todas las Preguntas",
          contact_map_section_title: "Visita Nuestra Oficina",
          contact_map_office_name: "Oficina Principal de BookMyTourGuide",
          contact_map_get_directions: "Obtener Direcciones",
        },
        // ================================= FRENCH =================================
        fr: {
          nav_home: "Accueil",
          nav_about: "À Propos",
          nav_tours: "Circuits",
          nav_find_guides: "Réserver un Guide",
          nav_become_guide: "Devenir Guide",
          nav_guide_availability: " Disponibilité des Guides",
          nav_how_it_works: "Comment Ça Marche",
          nav_contact: "Contact",
          nav_blog: "Blog",
          profile_welcome: "Bienvenue !",
          profile_signin_prompt: "Connectez-vous",
          profile_login: "Connexion",
          profile_register: "S'inscrire",
          profile_dashboard: "Tableau de Bord",
          profile_logout: "Déconnexion",
          profile_logging_out: "Déconnexion...",
          mobile_language_label: "Langue",
          hero_title_taj: "Découvrez le Taj Mahal",
          hero_subtitle_taj:
            "Découvrez l'architecture moghole avec des guides experts",
          hero_category_taj: "Circuits du Patrimoine",
          hero_title_rajasthan: "Explorez la Cité Dorée du Rajasthan",
          hero_subtitle_rajasthan:
            "Flânez dans les forts et palais majestueux de Jaisalmer",
          hero_category_rajasthan: "Aventures dans le Désert",
          tours_available: "Circuits Disponibles",
          expert_guides: "Guides Experts",
          average_rating: "Note Moyenne",
          book_your_tour_now: "Réservez Votre Circuit",
          become_a_guide: "Devenir Guide",
          verified_guides: "Guides Vérifiés",
          secure_payments: "Paiements Sécurisés",
          support_24_7: "Support 24/7",

          footer_quick_links: "Liens Rapides",
          footer_contact_details: "Coordonnées",
          footer_payment_methods: "Méthodes de Paiement Sécurisées",

          explore_tour_categories: "Découvrez Nos Catégories de Circuits",
          explore_tour_categories_desc:
            "Choisissez parmi nos expériences authentiques, dirigées par des experts locaux certifiés.",
          available_in_languages: "Disponible en 10+ langues",
          per_person: "par personne",
          add_to_cart: "Ajouter au Panier",
          view_tours: "Voir les Circuits",
          looking_for_something_specific:
            "Vous Cherchez Quelque Chose de Spécifique ?",
          custom_tour_prompt:
            "Nos guides peuvent créer des expériences sur mesure pour vous.",
          request_custom_tour: "Demander un Circuit sur Mesure",
          join_our_network: "Rejoignez Notre Réseau",
          become_certified_guide: "Devenez un Guide Certifié",
          guide_reg_desc:
            "Rejoignez notre réseau de guides professionnels et partagez votre passion pour la culture locale.",
          benefit_title_1: "Revenu Premium",
          benefit_desc_1: "Gagnez 200-500 $ par jour.",
          benefit_title_2: "Vérifié et Fiable",
          benefit_desc_2: "Le processus de vérification renforce la confiance.",
          benefit_title_3: "Portée Mondiale",
          benefit_desc_3: "Connectez-vous avec des voyageurs du monde entier.",
          benefit_title_4: "Croissance Professionnelle",
          benefit_desc_4: "Accès à des programmes de formation.",
          start_application: "Démarrer la Candidature",
          guide_requirements_title: "Exigences pour les Guides",
          req_1: "Pièce d'identité valide et preuve de résidence",
          req_2: "Minimum 2 ans d'expérience",
          req_3: "Maîtrise de l'anglais + langue locale",
          req_4: "Certification de secourisme",
          req_5: "Vérification des antécédents",
          req_6: "Références professionnelles",
          app_process_title: "Processus de Candidature",
          app_step_1: "1. Soumettre la candidature (5 min)",
          app_step_2: "2. Vérification des documents (2-3 jours)",
          app_step_3: "3. Entretien vidéo",
          app_step_4: "4. Vérification des antécédents",
          app_step_5: "5. Bienvenue dans la famille !",
          booking_proc_title: "Processus de Réservation Simple",
          booking_proc_desc:
            "Réservez votre circuit parfait en quelques clics.",
          step_1_title: "Choisissez Votre Expérience",
          step_1_desc: "Parcourez nos circuits et sélectionnez votre guide.",
          step_1_details: "Filtrez par lieu, langue, prix.",
          step_2_title: "Sélectionnez Date et Heure",
          step_2_desc: "Vérifiez la disponibilité en temps réel.",
          step_2_details: "Confirmation instantanée.",
          step_3_title: "Paiement Sécurisé",
          step_3_desc: "Payez en toute sécurité.",
          step_3_details: "Seulement 20-30% d'acompte.",
          step_4_title: "Confirmation et Rencontre",
          step_4_desc: "Recevez la confirmation et rencontrez votre guide.",
          step_4_details:
            "Obtenez les détails du contact et du point de rencontre.",
          feature_1_title: "Note Moyenne 4.9/5",
          feature_1_desc: "Basé sur 10 000+ avis.",
          feature_2_title: "Expertise Locale",
          feature_2_desc: "Tous les guides sont des locaux.",
          feature_3_title: "100% Vérifié",
          feature_3_desc: "Chaque guide passe notre processus de vérification.",
          testimonials_title_community: "Écoutez Notre Communauté",
          testimonials_desc: "Histoires vraies de voyageurs en Inde.",
          no_testimonials: "Aucun témoignage disponible.",
          stat_happy_travelers: "Voyageurs Satisfaits",
          stat_total_reviews: "Total des Avis",
          stat_expert_guides: "Guides Experts",
          stat_avg_rating: "Note Moyenne",
          video_unavailable: "Vidéo non disponible",
          footer_company_subtitle: "Tourisme Professionnel",
          footer_company_description:
            "Mettre en relation les voyageurs avec des guides locaux certifiés pour des expériences authentiques et sûres.",
          footer_available_languages: "Disponible en 15+ langues",
          footer_tour_types: "Types de Circuits",
          footer_destinations: "Destinations Populaires",
          footer_support: "Support et Politiques",
          footer_stay_updated: "Restez Informé",
          footer_newsletter_prompt: "Recevez les dernières offres.",
          footer_email_placeholder: "Entrez votre e-mail",
          footer_subscribe: "S'abonner",
          footer_copyright: "© 2024 BookMyTourGuide. Tous droits réservés.",
          footer_legal_links:
            "Politique de Confidentialité | Conditions d'Utilisation",

          help_center: "Centre d'Aide",
          safety_guidelines: "Consignes de Sécurité",
          privacy_policy: "Politique de Confidentialité",
          refund_and_cancellation: "Remboursement et Annulation",
          terms_and_conditions: "Termes et Conditions",
          guide_verification: "Vérification des Guides",
          customer_support: "Support Client",

          about_platform_title: "À Propos de",
          about_platform_p1:
            "IndiaTourManager.com est une plateforme numérique qui met en relation des guides touristiques linguistiques certifiés de toute l'Inde avec des voyageurs internationaux.",
          about_platform_p2:
            "Notre mission est de responsabiliser les guides touristiques indiens, d'améliorer l'expérience des visiteurs et de promouvoir un tourisme authentique et transparent.",
          about_platform_p3:
            "Nous rassemblons un réseau de guides qualifiés ayant réussi les programmes de certification gouvernementaux. Les voyageurs étrangers peuvent choisir et se connecter directement avec des guides correspondant à leurs besoins.",
          about_stat_guides: "Guides Certifiés",
          about_stat_cities: "Villes Couvertes",
          about_card_gov: "Gouvernement",
          about_card_cert: "Certifié",
          about_card_lic: "Licencié et Vérifié",
          aims_header: "Nos Buts",
          aims_title: "Buts et Objectifs",
          aims_p1:
            "Nos objectifs stratégiques guident chaque décision, garantissant un impact significatif pour les guides et les voyageurs.",
          aims_obj_1:
            "Créer un système d'emploi transparent et direct pour les guides touristiques licenciés en Inde",
          aims_obj_2:
            "Promouvoir le tourisme indien dans le monde grâce à une expertise professionnelle et linguistique",
          aims_obj_3:
            "Améliorer la satisfaction des visiteurs grâce à des expériences authentiques et bien guidées",
          aims_obj_4:
            "Garantir que les guides reçoivent des paiements équitables et ponctuels, sans intermédiaires",
          aims_obj_5:
            "Contribuer à l'économie touristique de l'Inde en responsabilisant les professionnels certifiés",
          gt_header: "Focus Spécial",
          gt_title: "Notre Focus Spécial — Le Triangle d'Or",
          gt_p1:
            "Le Triangle d'Or — Delhi, Agra et Jaipur — représente le cœur de l'expérience touristique de l'Inde.",
          gt_p2:
            "Chez IndiaTourManager.com, nous nous spécialisons dans l'offre des meilleurs guides pour cette région.",
          gt_stat_cities: "Villes Iconiques",
          gt_stat_exp: "Expériences",
          gt_overlay_title: "Le Triangle d'Or",
          gt_overlay_feat1: "Sites du Patrimoine",
          gt_overlay_feat2: "Lieux Photos",
          mission_vision_header: "Notre Objectif",
          mission_vision_title: "Déclaration de Mission et Vision",
          mission_title: "Mission",
          mission_p:
            "Connecter les voyageurs du monde entier avec des guides touristiques indiens certifiés et multilingues, en veillant à ce que chaque voyage en Inde soit sûr, instructif et inoubliable.",
          vision_p:
            "Devenir la plateforme en ligne la plus fiable de l'Inde pour les réservations de guides touristiques professionnels.",
          why_choose_header: "Pourquoi Nous Choisir",
          why_choose_title:
            "Pourquoi Choisir ou S'inscrire sur IndiaTourManager.com",
          reason_1_title: "Accès Direct",
          reason_1_desc:
            "Connectez-vous directement avec des guides agréés - sans agences ni courtiers.",
          reason_2_title: "Tarification Équitable",
          reason_2_desc:
            "Payez directement le guide selon les normes approuvées.",
          reason_3_title: "Expertise Linguistique",
          reason_3_desc: "Choisissez des guides qui parlent votre langue.",
          reason_4_title: "Support de Voyage Complet",
          reason_4_desc: "Personnalisez votre voyage sur une seule plateforme.",
          reason_5_title: "Vidéo Souvenir YouTube Gratuite",
          reason_5_desc: "Obtenez une vidéo de voyage gratuite.",
          reason_6_title: "Professionnels Vérifiés",
          reason_6_desc: "Chaque guide est approuvé par le gouvernement.",
          reason_7_title: "Expérience Authentique",
          reason_7_desc:
            "Voyagez en toute confiance et profitez d'une expérience réelle.",
          reason_8_title: "Savoir-Faire d'Expert",
          reason_8_desc: "Profitez de guides experts de leur région.",
          why_guide_header: "Excellence Certifiée",
          why_guide_title:
            "Pourquoi il est Nécessaire d'Engager un Guide Agréé",
          why_guide_p:
            "Découvrez pourquoi le choix de guides certifiés et approuvés par le gouvernement garantit la meilleure expérience de voyage en Inde.",
          why_guide_reason_1_title: "Autorisation Gouvernementale",
          why_guide_reason_1_desc:
            "Chaque guide sur notre plateforme est licencié par le gouvernement indien.",
          why_guide_reason_2_title: "Expertise Linguistique",
          why_guide_reason_2_desc:
            "Nos guides parlent plusieurs langues étrangères couramment.",
          why_guide_reason_3_title: "Sécurité et Confiance",
          why_guide_reason_3_desc:
            "Les guides autorisés protègent contre la fraude.",
          why_guide_reason_4_title: "Précision Culturelle",
          why_guide_reason_4_desc:
            "Les guides licenciés fournissent des informations culturelles authentiques.",
          why_guide_reason_5_title: "Transparence",
          why_guide_reason_5_desc:
            "Les paiements vont directement du client au guide.",
          yt_header: "Fonctionnalité de Souvenir",
          yt_title: "Notre Fonctionnalité de Souvenir YouTube",
          yt_p1:
            "Pour rendre votre voyage inoubliable, nous offrons un service de vidéo souvenir gratuit.",
          yt_p2:
            "Pendant votre visite, votre guide peut capturer des clips de votre expérience, qui seront ensuite montés et mis en ligne sur YouTube, vous permettant de :",
          yt_feat_1: "Revivez votre voyage à tout moment",
          yt_feat_2: "Partagez-le facilement avec vos proches",
          yt_feat_3: "Préservez votre histoire de voyage pour toujours",
          yt_p3:
            "Ce service est notre façon d'ajouter une touche personnelle à votre voyage.",
          yt_overlay_title: "Service Vidéo Gratuit",
          // ================================= FIND GUIDES PAGE =================================
          find_guides_badge: "Explorez avec des Experts",
          find_guides_title: "Trouvez Votre Guide Local Parfait",
          find_guides_desc:
            "Sélectionnez un lieu et une langue pour vous connecter avec nos guides touristiques certifiés et professionnels.",
          find_guides_card_title: "Découvrez Votre Guide",
          find_guides_card_desc:
            "Commencez par sélectionner votre destination et votre langue souhaitées.",
          find_guides_destination_label: "Destination",
          find_guides_destination_placeholder: "Sélectionnez un lieu",
          find_guides_language_label: "Langue",
          find_guides_language_placeholder: "Sélectionnez une langue",
          find_guides_button: "Trouver des Guides",
          find_guides_error_title: "Erreur de Chargement des Guides",
          find_guides_try_again: "Réessayer",
          find_guides_results_title: "Rencontrez Vos Guides Experts",
          find_guides_not_found_title: "Aucun Guide Trouvé",
          find_guides_not_found_desc:
            "Malheureusement, aucun guide ne correspond à vos critères. Veuillez essayer une autre combinaison.",
          find_guides_new_search: "Nouvelle Recherche",
          find_guides_book_button: "Voir et Réserver",

          // ================================= TOURS PAGE =================================
          tours_badge: "Explorer les Circuits",
          tours_title: "Découvrez les Trésors Cachés de l'Inde",
          tours_desc:
            "Parcourez des expériences organisées par des guides locaux vérifiés et découvrez le cœur de chaque destination.",
          tours_search_placeholder: "Rechercher par nom ou description...",
          tours_filter_placeholder: "Filtrer par Lieu",
          tours_all_locations: "Tous les Lieux",
          tours_failed_title: "Échec du Chargement des Circuits",
          tours_not_found_title: "Aucun Circuit Trouvé",
          tours_not_found_desc:
            "Essayez d'ajuster votre recherche ou vos filtres.",
          // ================================= BECOME A GUIDE PAGE =================================
          guide_page_badge: "Rejoignez Notre Réseau",
          guide_page_title: "Devenez Partenaire BookMyTourGuide",
          guide_page_desc:
            "Donnez aux voyageurs le pouvoir de votre connaissance locale et gagnez de l'argent en partageant les histoires uniques de votre ville.",
          guide_page_why_join: "Pourquoi Rejoindre BookMyTourGuide ?",
          guide_page_benefit_1_title: "Gagnez 500-2000 ₹/heure",
          guide_page_benefit_1_desc:
            "Fixez vos propres tarifs et obtenez un revenu compétitif.",
          guide_page_benefit_2_title: "Horaires Flexibles",
          guide_page_benefit_2_desc:
            "Travaillez quand vous le souhaitez et choisissez vos propres circuits.",
          guide_page_benefit_3_title: "Croissance Professionnelle",
          guide_page_benefit_3_desc:
            "Construisez votre réputation et élargissez votre réseau.",
          guide_page_benefit_4_title: "Plateforme Vérifiée",
          guide_page_benefit_4_desc:
            "Rejoignez notre communauté de confiance de guides certifiés.",
          guide_page_requirements_title: "Nos Exigences",
          guide_page_what_we_look_for: "Ce Que Nous Recherchons",
          guide_page_req_1:
            "Pièce d'identité valide délivrée par le gouvernement",
          guide_page_req_2: "Minimum 2 ans d'expérience en tant que guide",
          guide_page_req_3:
            "Maîtrise de l'anglais et d'au moins une langue locale",
          guide_page_req_4:
            "Connaissance approfondie de l'histoire et de la culture locales",
          guide_page_req_5: "Une attitude professionnelle et amicale",
          guide_page_req_6: "Un smartphone avec accès à Internet",
          guide_page_verification_title: "Notre Processus de Vérification",
          guide_page_step_1:
            "Soumettez une candidature en ligne avec vos documents.",
          guide_page_step_2:
            "Notre équipe effectue une vérification des antécédents et un bref entretien en ligne.",
          guide_page_step_3:
            "Suivez notre formation sur la plateforme et obtenez votre certification.",
          guide_page_step_4:
            "Activez votre profil et commencez à recevoir des réservations de circuits !",
          guide_page_cta_title: "Prêt à Guider Votre Prochaine Aventure ?",
          guide_page_cta_desc:
            "Commencez votre parcours de guide professionnel dès aujourd'hui. Cliquez sur le bouton ci-dessous pour commencer le processus d'inscription et rejoindre une communauté passionnée.",
          guide_page_cta_button:
            "Devenez un Guide Touristique Certifié et Vérifié",
          // French
          how_badge: "Comment Ça Marche",
          how_title: "Étapes Simples pour Planifier Votre Voyage Parfait",
          how_desc:
            "Du choix d'un guide à la réservation de votre prochaine aventure — découvrez à quel point il est facile de voyager avec BookMyTourGuide.",
          how_section_1_title:
            "Réservez Votre Circuit Parfait en 4 Étapes Faciles",
          how_step_1_title: "Rechercher et Parcourir",
          how_step_1_desc:
            "Parcourez notre sélection de circuits et de guides en fonction de vos intérêts, de votre lieu et de vos dates.",
          how_step_1_detail_1: "Filtrer par type de circuit, lieu et prix",
          how_step_1_detail_2: "Lire les profils et avis des guides",
          how_step_1_detail_3: "Voir les itinéraires détaillés",
          how_step_1_detail_4: "Vérifier la disponibilité en temps réel",
          how_step_2_title: "Choisissez Votre Guide",
          how_step_2_desc:
            "Sélectionnez parmi nos guides locaux vérifiés qui correspondent à vos préférences.",
          how_step_2_detail_1: "Tous les guides sont vérifiés",
          how_step_2_detail_2: "Voir les notes et avis authentiques",
          how_step_2_detail_3: "Vérifier les préférences linguistiques",
          how_step_2_detail_4: "Voir les domaines de spécialisation",
          how_step_3_title: "Réservation Sécurisée",
          how_step_3_desc:
            "Réservez votre circuit avec un petit acompte. Payez le reste après le circuit.",
          how_step_3_detail_1: "Payez seulement 20-30% d'acompte",
          how_step_3_detail_2: "Passerelle de paiement sécurisée",
          how_step_3_detail_3: "Confirmation de réservation instantanée",
          how_step_3_detail_4: "Annulation gratuite jusqu'à 24h",
          how_step_4_title: "Profitez de Votre Circuit",
          how_step_4_desc:
            "Rencontrez votre guide au lieu désigné et commencez votre aventure indienne.",
          how_step_4_detail_1: "Suivi GPS pour la sécurité",
          how_step_4_detail_2: "Support d'urgence 24/7",
          how_step_4_detail_3: "Personnalisation flexible du circuit",
          how_step_4_detail_4: "Service de guide professionnel",
          how_payment_title: "Processus de Paiement Transparent",
          how_payment_step_1_title: "Acompte",
          how_payment_step_1_desc: "Payez 20-30% pour confirmer",
          how_payment_step_1_timing: "À la réservation",
          how_payment_step_2_title: "Fin du Circuit",
          how_payment_step_2_desc: "Profitez de votre expérience",
          how_payment_step_2_amount: "Expérience",
          how_payment_step_2_timing: "Pendant le circuit",
          how_payment_step_3_title: "Paiement Final",
          how_payment_step_3_desc: "Payez le reste au guide",
          how_payment_step_3_timing: "Après le circuit",
          how_payment_step_4_title: "Évaluer",
          how_payment_step_4_desc: "Partagez votre expérience",
          how_payment_step_4_amount: "Avis",
          how_payment_step_4_timing: "Post-circuit",
          how_payment_footer:
            "Paiements sécurisés • Pas de frais cachés • Remboursement intégral",
          how_safety_title: "Votre Sécurité est Notre Priorité",
          how_safety_feat_1_title: "Guides Vérifiés",
          how_safety_feat_1_desc:
            "Vérification des antécédents, d'identité et formation",
          how_safety_feat_2_title: "Support 24/7",
          how_safety_feat_2_desc:
            "Assistance d'urgence disponible pendant votre circuit",
          how_safety_feat_3_title: "Suivi GPS",
          how_safety_feat_3_desc:
            "Partage de position en temps réel pour plus de sécurité",
          how_safety_feat_4_title: "Assurance Qualité",
          how_safety_feat_4_desc: "Système de suivi et de feedback régulier",
          how_for_guides_title: "Voulez-vous Devenir un Guide ?",
          how_guide_step_1_title: "Candidature",
          how_guide_step_1_desc: "Soumettez votre profil et vos documents",
          how_guide_step_2_title: "Vérification",
          how_guide_step_2_desc: "Vérification des antécédents et entretien",
          how_guide_step_3_title: "Formation",
          how_guide_step_3_desc: "Complétez notre programme de certification",
          how_guide_step_4_title: "En Ligne",
          how_guide_step_4_desc: "Commencez à recevoir des réservations",
          how_for_guides_button: "Postuler pour Devenir Guide",
          how_faq_title: "Questions Fréquemment Posées",
          how_faq_travelers: "Pour les Voyageurs",
          how_faq_q1: "Puis-je annuler ma réservation ?",
          how_faq_a1:
            "Oui, annulation gratuite jusqu'à 24 heures avant le circuit.",
          how_faq_q2: "Les guides sont-ils vérifiés ?",
          how_faq_a2: "Tous les guides sont soumis à des vérifications.",
          how_faq_q3: "Et si j'ai besoin d'aide ?",
          how_faq_a3: "Un support d'urgence 24/7 est disponible.",
          how_faq_guides: "Pour les Guides",
          how_faq_q4: "Combien puis-je gagner ?",
          how_faq_a4: "500-2000 ₹ de l'heure selon l'expérience.",
          how_faq_q5: "Quand suis-je payé ?",
          how_faq_a5: "Le paiement est reçu directement après le circuit.",
          how_faq_q6: "Puis-je définir mon propre horaire ?",
          how_faq_a6: "Oui, vous avez un contrôle total.",
          how_cta_title: "Prêt à Commencer Votre Voyage ?",
          how_cta_desc:
            "Rejoignez des milliers de voyageurs qui ont découvert l'Inde authentique.",
          how_cta_button1: "Réservez Votre Premier Circuit",
          how_cta_button2: "Explorer Tous les Circuits",
          //contact
          contact_badge: "Contactez-nous",
          contact_title: "Nous Sommes Là Pour Vous Aider à Explorer",
          contact_desc:
            "Des questions ou des commentaires ? Contactez-nous pour une expérience de voyage fluide.",
          contact_info_phone_title: "Support Téléphonique",
          contact_info_phone_desc: "Disponible 24/7 pour les urgences",
          contact_info_email_title: "Support par E-mail",
          contact_info_email_desc: "Réponse sous 2-4 heures",
          contact_info_office_title: "Siège Social",
          contact_info_office_desc: "Visitez-nous Lun-Ven, 9h-18h",
          contact_info_hours_title: "Heures d'Ouverture",
          contact_info_hours_desc: "Heure Normale de l'Inde (IST)",
          contact_form_section_title: "Envoyez-nous un Message",
          contact_form_card_title: "Formulaire de Contact",
          contact_form_card_desc:
            "Remplissez le formulaire ci-dessous et nous vous répondrons sous 24 heures",
          contact_form_success_title: "Message Envoyé !",
          contact_form_success_desc:
            "Merci de nous avoir contactés. Nous vous répondrons sous peu.",
          contact_form_error_title: "Erreur",
          contact_form_name_label: "Nom Complet *",
          contact_form_name_placeholder: "Votre nom complet",
          contact_form_phone_label: "Numéro de Téléphone *",
          contact_form_phone_placeholder: "+91 9876543210",
          contact_form_email_label: "Adresse E-mail *",
          contact_form_email_placeholder: "votre.email@exemple.com",
          contact_form_category_label: "Catégorie *",
          contact_form_category_placeholder: "Sélectionnez le type de demande",
          contact_form_cat_booking: "Réservation de Circuit",
          contact_form_cat_guide: "Devenir Guide",
          contact_form_cat_support: "Support Technique",
          contact_form_cat_partnership: "Partenariat",
          contact_form_cat_feedback: "Commentaires",
          contact_form_cat_other: "Autre",
          contact_form_subject_label: "Sujet *",
          contact_form_subject_placeholder: "Sujet bref de votre demande",
          contact_form_message_label: "Message *",
          contact_form_message_placeholder:
            "Veuillez fournir des détails sur votre demande...",
          contact_form_sending: "Envoi en cours...",
          contact_form_send_button: "Envoyer le Message",
          contact_faq_section_title: "Questions Fréquemment Posées",
          contact_faq_cat_travelers: "Pour les Voyageurs",
          contact_form_nationality_label: "nationalité",
          contact_form_nationality_placeholder: "ta nationalité",
          contact_faq_q1: "Comment réserver un circuit ?",
          contact_faq_q2: "Qu'est-ce qui est inclus dans le prix du circuit ?",
          contact_faq_q3: "Puis-je annuler ou reprogrammer ?",
          contact_faq_q4: "Comment les guides sont-ils vérifiés ?",
          contact_faq_cat_guides: "Pour les Guides",
          contact_faq_q5: "Comment devenir guide ?",
          contact_faq_q6: "Quelles sont les exigences ?",
          contact_faq_q7: "Comment suis-je payé ?",
          contact_faq_q8: "Comment mettre à jour mon profil ?",
          contact_faq_cat_general: "Support Général",
          contact_faq_q9: "Problèmes techniques avec le site web",
          contact_faq_q10: "Problèmes de paiement",
          contact_faq_q11: "Gestion de compte",
          contact_faq_q12: "Préoccupations de sécurité",
          contact_faq_view_all: "Voir Toutes les FAQs",
          contact_map_section_title: "Visitez Notre Bureau",
          contact_map_office_name: "Siège Social de BookMyTourGuide",
          contact_map_get_directions: "Obtenir l'Itinéraire",
        },
        // ================================= RUSSIAN =================================
        ru: {
          nav_home: "Главная",
          nav_about: "О нас",
          nav_tours: "Туры",
          nav_find_guides: "Найти Гида",
          nav_become_guide: "Стать Гидом",
          nav_guide_availability: " Доступность Гидов",
          nav_how_it_works: "Как это работает",
          nav_contact: "Контакты",
          nav_blog: "Блог",
          profile_welcome: "Добро пожаловать!",
          profile_signin_prompt: "Войдите в аккаунт",
          profile_login: "Войти",
          profile_register: "Регистрация",
          profile_dashboard: "Панель",
          profile_logout: "Выйти",
          profile_logging_out: "Выход...",
          mobile_language_label: "Язык",
          hero_title_taj: "Откройте Тадж-Махал",
          hero_subtitle_taj:
            "Познакомьтесь с вершиной могольской архитектуры с опытными гидами",
          hero_category_taj: "Туры по наследию",
          hero_title_rajasthan: "Исследуйте Золотой город Раджастхана",
          hero_subtitle_rajasthan:
            "Прогуляйтесь по величественным фортам и дворцам Джайсалмера",
          hero_category_rajasthan: "Приключения в пустыне",
          tours_available: "Доступно Туров",
          expert_guides: "Эксперты-гиды",
          average_rating: "Средний Рейтинг",
          book_your_tour_now: "Забронировать Тур",
          become_a_guide: "Стать Гидом",
          verified_guides: "Проверенные гиды",
          secure_payments: "Безопасные платежи",
          support_24_7: "Поддержка 24/7",

          footer_quick_links: "Быстрые ссылки",
          footer_contact_details: "Контактная информация",
          footer_payment_methods: "Безопасные способы оплаты",

          explore_tour_categories: "Наши Категории Туров",
          explore_tour_categories_desc:
            "Выберите из наших аутентичных впечатлений, проводимых сертифицированными местными экспертами.",
          available_in_languages: "Доступно на 10+ языках",
          per_person: "с человека",
          add_to_cart: "Добавить в корзину",
          view_tours: "Посмотреть туры",
          looking_for_something_specific: "Ищете что-то особенное?",
          custom_tour_prompt:
            "Не можете найти идеальный тур? Наши гиды могут создать индивидуальные программы.",
          request_custom_tour: "Запросить индивидуальный тур",
          join_our_network: "Присоединяйтесь к нашей сети",
          become_certified_guide: "Станьте сертифицированным гидом",
          guide_reg_desc:
            "Присоединяйтесь к нашей сети профессиональных гидов и делитесь своей страстью к местной культуре.",
          benefit_title_1: "Получайте премиальный доход",
          benefit_desc_1: "Лучшие гиды зарабатывают 200-500 $ в день.",
          benefit_title_2: "Проверено и надежно",
          benefit_desc_2: "Процесс верификации создает доверие.",
          benefit_title_3: "Глобальный охват",
          benefit_desc_3: "Общайтесь с путешественниками со всего мира.",
          benefit_title_4: "Профессиональный рост",
          benefit_desc_4: "Доступ к программам обучения.",
          start_application: "Начать заявку",
          guide_requirements_title: "Требования к гидам",
          req_1: "Действующее удостоверение личности",
          req_2: "Минимум 2 года опыта",
          req_3: "Владение английским и местным языком",
          req_4: "Сертификат первой помощи",
          req_5: "Отсутствие судимостей",
          req_6: "Профессиональные рекомендации",
          app_process_title: "Процесс подачи заявки",
          app_step_1: "1. Подать онлайн-заявку (5 мин)",
          app_step_2: "2. Проверка документов (2-3 дня)",
          app_step_3: "3. Видеоинтервью",
          app_step_4: "4. Проверка на судимость",
          app_step_5: "5. Добро пожаловать в семью!",
          booking_proc_title: "Простой процесс бронирования",
          booking_proc_desc:
            "Забронируйте свой идеальный тур в несколько кликов.",
          step_1_title: "Выберите ваш опыт",
          step_1_desc: "Просмотрите наши туры и выберите гида.",
          step_1_details: "Фильтруйте по месту, языку, цене.",
          step_2_title: "Выберите дату и время",
          step_2_desc: "Проверьте доступность в реальном времени.",
          step_2_details: "Мгновенное подтверждение.",
          step_3_title: "Безопасная оплата",
          step_3_desc: "Платите безопасно.",
          step_3_details: "Предоплата всего 20-30%.",
          step_4_title: "Подтверждение и встреча",
          step_4_desc: "Получите подтверждение и встретьтесь с гидом.",
          step_4_details: "Получите контакты гида и место встречи.",
          feature_1_title: "Средний рейтинг 4.9/5",
          feature_1_desc: "На основе 10 000+ отзывов.",
          feature_2_title: "Местная экспертиза",
          feature_2_desc: "Все гиды — местные жители.",
          feature_3_title: "100% проверено",
          feature_3_desc: "Каждый гид проходит нашу проверку.",
          testimonials_title_community: "Отзывы нашего сообщества",
          testimonials_desc:
            "Реальные истории от путешественников, которые исследовали Индию с нашими опытными гидами.",
          no_testimonials: "На данный момент отзывов нет.",
          stat_happy_travelers: "Счастливых путешественников",
          stat_total_reviews: "Всего отзывов",
          stat_expert_guides: "Экспертных гидов",
          stat_avg_rating: "Средний рейтинг",
          video_unavailable: "Видео недоступно",
          footer_company_subtitle: "Профессиональный туризм",
          footer_company_description:
            "Связываем путешественников с сертифицированными местными гидами для аутентичных и безопасных впечатлений.",
          footer_available_languages: "Доступно на 15+ языках",
          footer_tour_types: "Типы туров",
          footer_destinations: "Популярные направления",
          footer_support: "Поддержка",
          footer_stay_updated: "Будьте в курсе",
          footer_newsletter_prompt: "Получайте последние предложения.",
          footer_email_placeholder: "Введите ваш e-mail",
          footer_subscribe: "Подписаться",
          footer_copyright: "© 2024 BookMyTourGuide. Все права защищены.",
          footer_legal_links:
            "Политика конфиденциальности | Условия обслуживания",

          help_center: "Центр помощи",
          safety_guidelines: "Правила безопасности",
          privacy_policy: "Политика конфиденциальности",
          refund_and_cancellation: "Возврат и отмена",
          terms_and_conditions: "Условия и положения",
          guide_verification: "Проверка гидов",
          customer_support: "Поддержка клиентов",

          about_platform_title: "О",
          about_platform_p1:
            "IndiaTourManager.com - это единая цифровая платформа, которая связывает сертифицированных лингвистических гидов со всей Индии с международными путешественниками.",
          about_platform_p2:
            "Наша миссия - расширить возможности гидов Индии, улучшить впечатления посетителей и продвигать аутентичный и прозрачный туризм.",
          about_platform_p3:
            "Мы объединяем сеть квалифицированных гидов, прошедших государственную сертификацию. Иностранные путешественники могут напрямую выбирать и связываться с гидами, соответствующими их потребностям.",
          about_stat_guides: "Сертифицированных Гидов",
          about_stat_cities: "Охвачено Городов",
          about_card_gov: "Правительство",
          about_card_cert: "Сертифицировано",
          about_card_lic: "Лицензировано и Проверено",
          aims_header: "Наши Цели",
          aims_title: "Цели и Задачи",
          aims_p1:
            "Наши стратегические цели определяют каждое наше решение, обеспечивая значимое влияние для гидов и путешественников.",
          aims_obj_1:
            "Создать прозрачную и прямую систему трудоустройства для лицензированных гидов Индии",
          aims_obj_2:
            "Продвигать индийский туризм на мировом уровне через профессиональную и языковую экспертизу",
          aims_obj_3:
            "Повысить удовлетворенность посетителей за счет аутентичных и хорошо организованных впечатлений",
          aims_obj_4:
            "Гарантировать, что гиды получают справедливую и своевременную оплату без посредников",
          aims_obj_5:
            "Вносить вклад в экономику туризма Индии, расширяя возможности сертифицированных профессионалов",
          gt_header: "Особое внимание",
          gt_title: "Наш особый фокус — Золотой треугольник",
          gt_p1:
            "Золотой треугольник — Дели, Агра и Джайпур — представляет собой сердце туристического опыта Индии.",
          gt_p2:
            "На IndiaTourManager.com мы специализируемся на предоставлении лучших профессиональных гидов для этого региона.",
          gt_stat_cities: "Знаковые города",
          gt_stat_exp: "Впечатления",
          gt_overlay_title: "Золотой треугольник",
          gt_overlay_feat1: "Объекты наследия",
          gt_overlay_feat2: "Места для фото",
          mission_vision_header: "Наша Цель",
          mission_vision_title: "Заявление о Миссии и Видении",
          mission_title: "Миссия",
          vision_p:
            "Стать самой надежной онлайн-платформой в Индии для бронирования профессиональных гидов.",
          why_choose_header: "Почему выбирают нас",
          why_choose_title:
            "Почему стоит выбрать или зарегистрироваться на IndiaTourManager.com",
          reason_1_title: "Прямой доступ",
          reason_1_desc:
            "Связывайтесь напрямую с лицензированными гидами — без агентств и посредников.",
          reason_2_title: "Справедливые цены",
          reason_2_desc: "Платите напрямую гиду по утвержденным тарифам.",
          reason_3_title: "Языковая экспертиза",
          reason_3_desc: "Выбирайте гидов, говорящих на вашем языке.",
          reason_4_title: "Комплексная поддержка",
          reason_4_desc: "Настройте всю поездку на одной платформе.",
          reason_5_title: "Бесплатное видео на YouTube",
          reason_5_desc: "Получите бесплатное видео о путешествии.",
          reason_6_title: "Проверенные профессионалы",
          reason_6_desc: "Каждый гид одобрен правительством.",
          reason_7_title: "Аутентичный опыт",
          reason_7_desc:
            "Путешествуйте уверенно и наслаждайтесь настоящей Индией.",
          reason_8_title: "Экспертные знания",
          reason_8_desc: "Воспользуйтесь услугами гидов-экспертов.",
          why_guide_header: "Сертифицированное превосходство",
          why_guide_title:
            "Почему необходимо нанимать зарегистрированного гида",
          why_guide_p:
            "Узнайте, почему выбор сертифицированных, одобренных правительством гидов обеспечивает высочайшее качество путешествий по Индии.",
          why_guide_reason_1_title: "Государственная авторизация",
          why_guide_reason_1_desc:
            "Каждый гид на нашей платформе лицензирован правительством Индии.",
          why_guide_reason_2_title: "Языковая экспертиза",
          why_guide_reason_2_desc:
            "Наши гиды свободно говорят на нескольких иностранных языках.",
          why_guide_reason_3_title: "Безопасность и доверие",
          why_guide_reason_3_desc:
            "Авторизованные гиды защищают туристов от мошенничества.",
          why_guide_reason_4_title: "Культурная точность",
          why_guide_reason_4_desc:
            "Лицензированные гиды предоставляют подлинную информацию.",
          why_guide_reason_5_title: "Прозрачность",
          why_guide_reason_5_desc:
            "Платежи осуществляются напрямую от клиента к гиду.",
          yt_header: "Функция памяти",
          yt_title: "Наша функция памяти YouTube",
          yt_p1:
            "Чтобы сделать ваше путешествие незабываемым, мы предлагаем бесплатную услугу видеопамяти.",
          yt_p2:
            "Во время тура ваш гид может снимать короткие клипы, которые затем будут смонтированы и загружены на YouTube, позволяя вам:",
          yt_feat_1: "Переживите свое путешествие в любое время",
          yt_feat_2: "Легко делитесь с близкими",
          yt_feat_3: "Сохраните свою историю путешествий навсегда",
          yt_p3:
            "Эта услуга — наш способ добавить личный штрих в ваше путешествие.",
          yt_overlay_title: "Бесплатная видеоуслуга",
          // ================================= TOURS PAGE =================================
          tours_badge: "Исследуйте Туры",
          tours_title: "Откройте для себя Скрытые Жемчужины Индии",
          tours_desc:
            "Просмотрите тщательно подобранные впечатления под руководством проверенных местных гидов и откройте для себя сердце каждого направления.",
          tours_search_placeholder: "Поиск по названию или описанию...",
          tours_filter_placeholder: "Фильтр по Местоположению",
          tours_all_locations: "Все Местоположения",
          tours_failed_title: "Не удалось Загрузить Туры",
          tours_not_found_title: "Туры не найдены",
          tours_not_found_desc: "Попробуйте изменить поиск или фильтры.",
          // ================================= FIND GUIDES PAGE =================================
          find_guides_badge: "Исследуйте с Экспертами",
          find_guides_title: "Найдите своего Идеального Местного Гида",
          find_guides_desc:
            "Выберите местоположение и язык, чтобы связаться с нашими сертифицированными профессиональными гидами.",
          find_guides_card_title: "Найдите Вашего Гида",
          find_guides_card_desc: "Начните с выбора желаемого места и языка.",
          find_guides_destination_label: "Местоназначение",
          find_guides_destination_placeholder: "Выберите место",
          find_guides_language_label: "Язык",
          find_guides_language_placeholder: "Выберите язык",
          find_guides_button: "Найти Гидов",
          find_guides_error_title: "Ошибка при загрузке гидов",
          find_guides_try_again: "Попробовать снова",
          find_guides_results_title: "Познакомьтесь с Вашими Экспертами-Гидами",
          find_guides_not_found_title: "Гиды не найдены",
          find_guides_not_found_desc:
            "К сожалению, гиды, соответствующие вашим критериям, не найдены. Пожалуйста, попробуйте другую комбинацию.",
          find_guides_new_search: "Начать Новый Поиск",
          find_guides_book_button: "Посмотреть и забронировать",
          // ================================= BECOME A GUIDE PAGE =================================
          guide_page_badge: "Присоединяйтесь к Нашей Сети",
          guide_page_title: "Станьте Партнером BookMyTourGuide",
          guide_page_desc:
            "Помогите путешественникам своими местными знаниями и зарабатывайте, делясь уникальными историями вашего города.",
          guide_page_why_join: "Почему стоит присоединиться к BookMyTourGuide?",
          guide_page_benefit_1_title: "Зарабатывайте 500-2000 ₹/час",
          guide_page_benefit_1_desc:
            "Устанавливайте свои тарифы и получайте конкурентоспособный доход.",
          guide_page_benefit_2_title: "Гибкий График",
          guide_page_benefit_2_desc:
            "Работайте, когда хотите, и выбирайте свои туры.",
          guide_page_benefit_3_title: "Профессиональный Рост",
          guide_page_benefit_3_desc:
            "Создайте свою репутацию и расширьте свою сеть.",
          guide_page_benefit_4_title: "Проверенная Платформа",
          guide_page_benefit_4_desc:
            "Присоединяйтесь к нашему надежному сообществу сертифицированных гидов.",
          guide_page_requirements_title: "Наши Требования",
          guide_page_what_we_look_for: "Что Мы Ищем",
          guide_page_req_1:
            "Действующее удостоверение личности государственного образца",
          guide_page_req_2: "Минимум 2 года опыта работы гидом",
          guide_page_req_3:
            "Свободное владение английским и хотя бы одним местным языком",
          guide_page_req_4: "Глубокие знания местной истории и культуры",
          guide_page_req_5: "Профессиональное и дружелюбное отношение",
          guide_page_req_6: "Смартфон с доступом в Интернет",
          guide_page_verification_title: "Наш Процесс Проверки",
          guide_page_step_1: "Подайте онлайн-заявку со своими документами.",
          guide_page_step_2:
            "Наша команда проводит проверку данных и краткое онлайн-собеседование.",
          guide_page_step_3:
            "Пройдите обучение на нашей платформе и получите сертификат.",
          guide_page_step_4:
            "Активируйте свой профиль и начните получать заказы на туры!",
          guide_page_cta_title: "Готовы Провести Ваше Следующее Приключение?",
          guide_page_cta_desc:
            "Начните свой путь профессионального гида сегодня. Нажмите кнопку ниже, чтобы начать процесс регистрации и присоединиться к увлеченному сообществу.",
          guide_page_cta_button: "Станьте Проверенным Сертифицированным Гидом",
          // Russian
          how_badge: "Как это работает",
          how_title:
            "Простые Шаги для Планирования Вашего Идеального Путешествия",
          how_desc:
            "От выбора гида до бронирования вашего следующего приключения — узнайте, как легко путешествовать с BookMyTourGuide.",
          how_section_1_title:
            "Забронируйте Свой Идеальный Тур за 4 Простых Шага",
          how_step_1_title: "Поиск и Просмотр",
          how_step_1_desc:
            "Просмотрите наш тщательно подобранный выбор туров и гидов в соответствии с вашими интересами, местоположением и датами.",
          how_step_1_detail_1: "Фильтр по типу тура, месту и цене",
          how_step_1_detail_2: "Читайте профили и отзывы гидов",
          how_step_1_detail_3: "Просматривайте подробные маршруты",
          how_step_1_detail_4: "Проверяйте доступность в реальном времени",
          how_step_2_title: "Выберите Вашего Гида",
          how_step_2_desc:
            "Выберите из наших проверенных местных гидов, которые соответствуют вашим предпочтениям.",
          how_step_2_detail_1: "Все гиды проходят проверку",
          how_step_2_detail_2: "Смотрите рейтинги и отзывы",
          how_step_2_detail_3: "Проверяйте языковые предпочтения",
          how_step_2_detail_4: "Смотрите области специализации",
          how_step_3_title: "Безопасное Бронирование",
          how_step_3_desc:
            "Забронируйте тур с небольшой предоплатой. Оплатите остаток после тура.",
          how_step_3_detail_1: "Предоплата всего 20-30%",
          how_step_3_detail_2: "Безопасный платежный шлюз",
          how_step_3_detail_3: "Мгновенное подтверждение",
          how_step_3_detail_4: "Бесплатная отмена за 24 часа",
          how_step_4_title: "Наслаждайтесь Туром",
          how_step_4_desc:
            "Встретьтесь с гидом в назначенном месте и начните свое индийское приключение.",
          how_step_4_detail_1: "GPS-отслеживание для безопасности",
          how_step_4_detail_2: "Круглосуточная поддержка",
          how_step_4_detail_3: "Гибкая настройка тура",
          how_step_4_detail_4: "Профессиональные услуги гида",
          how_payment_title: "Прозрачный Процесс Оплаты",
          how_payment_step_1_title: "Предоплата",
          how_payment_step_1_desc: "Оплатите 20-30% для подтверждения",
          how_payment_step_1_timing: "При бронировании",
          how_payment_step_2_title: "Завершение Тура",
          how_payment_step_2_desc: "Наслаждайтесь вашим туром",
          how_payment_step_2_amount: "Впечатления",
          how_payment_step_2_timing: "Во время тура",
          how_payment_step_3_title: "Окончательный Расчет",
          how_payment_step_3_desc: "Оплатите остаток гиду",
          how_payment_step_3_timing: "После тура",
          how_payment_step_4_title: "Отзыв и Оценка",
          how_payment_step_4_desc: "Поделитесь впечатлениями",
          how_payment_step_4_amount: "Отзыв",
          how_payment_step_4_timing: "После тура",
          how_payment_footer:
            "Безопасные платежи • Без скрытых комиссий • Полный возврат",
          how_safety_title: "Ваша Безопасность — Наш Приоритет",
          how_safety_feat_1_title: "Проверенные Гиды",
          how_safety_feat_1_desc:
            "Проверка данных, удостоверений личности и обучение",
          how_safety_feat_2_title: "Поддержка 24/7",
          how_safety_feat_2_desc:
            "Экстренная линия помощи доступна во время тура",
          how_safety_feat_3_title: "GPS-Отслеживание",
          how_safety_feat_3_desc: "Обмен местоположением в реальном времени",
          how_safety_feat_4_title: "Гарантия Качества",
          how_safety_feat_4_desc:
            "Регулярный мониторинг и система обратной связи",
          how_for_guides_title: "Хотите Стать Гидом?",
          how_guide_step_1_title: "Заявка",
          how_guide_step_1_desc: "Отправьте свой профиль и документы",
          how_guide_step_2_title: "Проверка",
          how_guide_step_2_desc: "Проверка данных и собеседование",
          how_guide_step_3_title: "Обучение",
          how_guide_step_3_desc: "Завершите нашу программу сертификации",
          how_guide_step_4_title: "Выход в онлайн",
          how_guide_step_4_desc: "Начните получать заказы",
          how_for_guides_button: "Подать заявку, чтобы стать гидом",
          how_faq_title: "Часто Задаваемые Вопросы",
          how_faq_travelers: "Для Путешественников",
          how_faq_q1: "Могу ли я отменить бронирование?",
          how_faq_a1: "Да, бесплатная отмена за 24 часа до тура.",
          how_faq_q2: "Проверены ли гиды?",
          how_faq_a2: "Все гиды проходят проверку.",
          how_faq_q3: "Что делать, если нужна помощь?",
          how_faq_a3: "Доступна круглосуточная поддержка.",
          how_faq_guides: "Для Гидов",
          how_faq_q4: "Сколько я могу заработать?",
          how_faq_a5: "Оплата производится после тура.",
          how_faq_q6: "Могу ли я установить свой график?",
          how_faq_a6: "Да, у вас полный контроль.",
          how_cta_title: "Готовы Начать Свое Путешествие?",
          how_cta_desc:
            "Присоединяйтесь к тысячам путешественников, открывших для себя Индию.",
          how_cta_button1: "Забронировать Первый Тур",
          how_cta_button2: "Исследовать Все Туры",

          //contact
          contact_badge: "Свяжитесь с нами",
          contact_title: "Мы здесь, чтобы помочь вам исследовать",
          contact_desc:
            "Есть вопросы или отзывы? Свяжитесь с нами, и мы сделаем ваше путешествие безупречным.",
          contact_info_phone_title: "Поддержка по телефону",
          contact_info_phone_desc: "Доступно 24/7 для экстренных случаев",
          contact_info_email_title: "Поддержка по почте",
          contact_info_email_desc: "Ответ в течение 2-4 часов",
          contact_info_office_title: "Головной офис",
          contact_info_office_desc: "Посетите нас Пн-Пт, 9:00 - 18:00",
          contact_info_hours_title: "Рабочие часы",
          contact_info_hours_desc: "Индийское стандартное время (IST)",
          contact_form_section_title: "Отправьте нам сообщение",
          contact_form_card_title: "Контактная форма",
          contact_form_card_desc:
            "Заполните форму ниже, и мы свяжемся с вами в течение 24 часов",
          contact_form_success_title: "Сообщение отправлено!",
          contact_form_success_desc:
            "Спасибо, что связались с нами. Мы скоро ответим.",
          contact_form_error_title: "Ошибка",
          contact_form_name_label: "Полное имя *",
          contact_form_name_placeholder: "Ваше полное имя",
          contact_form_phone_label: "Номер телефона *",
          contact_form_phone_placeholder: "+91 9876543210",
          contact_form_email_label: "Электронная почта *",
          contact_form_email_placeholder: "vash.email@example.com",
          contact_form_category_label: "Категория *",
          contact_form_category_placeholder: "Выберите тип запроса",
          contact_form_cat_booking: "Бронирование тура",
          contact_form_cat_guide: "Стать гидом",
          contact_form_cat_support: "Техническая поддержка",
          contact_form_cat_partnership: "Партнерство",
          contact_form_cat_feedback: "Обратная связь",
          contact_form_cat_other: "Другое",
          contact_form_subject_label: "Тема *",
          contact_form_subject_placeholder: "Краткая тема вашего запроса",
          contact_form_message_label: "Сообщение *",
          contact_form_message_placeholder:
            "Пожалуйста, предоставьте детали...",
          contact_form_sending: "Отправка...",
          contact_form_send_button: "Отправить сообщение",
          contact_faq_section_title: "Часто задаваемые вопросы",
          contact_faq_cat_travelers: "Для путешественников",
          contact_form_nationality_label: "национальность",
          contact_form_nationality_placeholder: "твоя национальность",
          contact_faq_q1: "Как забронировать тур?",
          contact_faq_q2: "Что включено в стоимость тура?",
          contact_faq_q3: "Могу ли я отменить или перенести бронирование?",
          contact_faq_q4: "Как проверяются гиды?",
          contact_faq_cat_guides: "Для гидов",
          contact_faq_q5: "Как стать гидом?",
          contact_faq_q6: "Какие требования?",
          contact_faq_q7: "Как я получу оплату?",
          contact_faq_q8: "Как обновить мой профиль?",
          contact_faq_cat_general: "Общая поддержка",
          contact_faq_q9: "Технические проблемы с сайтом",
          contact_faq_q10: "Проблемы с оплатой",
          contact_faq_q11: "Управление аккаунтом",
          contact_faq_q12: "Вопросы безопасности",
          contact_faq_view_all: "Посмотреть все FAQ",
          contact_map_section_title: "Посетите наш офис",
          contact_map_office_name: "Головной офис BookMyTourGuide",
          contact_map_get_directions: "Проложить маршрут",
        },
        // ================================= GERMAN =================================
        de: {
          nav_home: "Start",
          nav_about: "Über Uns",
          nav_tours: "Touren",
          nav_find_guides: "Guide Buchen",
          nav_become_guide: "Guide Werden",
          nav_guide_availability: " Verfügbarkeit der Guides",
          nav_how_it_works: "So Geht's",
          nav_contact: "Kontakt",
          nav_blog: "Blog",
          profile_welcome: "Willkommen!",
          profile_signin_prompt: "Einloggen",
          profile_login: "Anmelden",
          profile_register: "Registrieren",
          profile_dashboard: "Dashboard",
          profile_logout: "Abmelden",
          profile_logging_out: "Abmeldung...",
          mobile_language_label: "Sprache",
          hero_title_taj: "Entdecken Sie das Taj Mahal",
          hero_subtitle_taj:
            "Erleben Sie Mogul-Architektur mit Expertenführern",
          hero_category_taj: "Kulturerbe-Touren",
          hero_title_rajasthan: "Erkunden Sie Rajasthans Goldene Stadt",
          hero_subtitle_rajasthan:
            "Wandern Sie durch die majestätischen Festungen und Paläste von Jaisalmer",
          hero_category_rajasthan: "Wüstenabenteuer",
          tours_available: "Verfügbare Touren",
          expert_guides: "Experten-Guides",
          average_rating: "Ø-Bewertung",
          book_your_tour_now: "Tour Buchen",
          become_a_guide: "Guide Werden",
          verified_guides: "Verifizierte Guides",
          secure_payments: "Sichere Zahlungen",
          support_24_7: "24/7 Support",

          footer_quick_links: "Schnell-Links",
          footer_contact_details: "Kontaktdaten",
          footer_payment_methods: "Sichere Zahlungsmethoden",
          explore_tour_categories: "Unsere Tour-Kategorien",
          explore_tour_categories_desc:
            "Wählen Sie aus authentischen Erlebnissen, geleitet von zertifizierten lokalen Experten.",
          available_in_languages: "Verfügbar in 10+ Sprachen",
          per_person: "pro Person",
          add_to_cart: "In den Warenkorb",
          view_tours: "Touren ansehen",
          looking_for_something_specific: "Suchen Sie etwas Bestimmtes?",
          custom_tour_prompt:
            "Finden Sie nicht die perfekte Tour? Unsere Guides können maßgeschneiderte Erlebnisse erstellen.",
          request_custom_tour: "Individuelle Tour anfragen",
          join_our_network: "Treten Sie unserem Netzwerk bei",
          become_certified_guide: "Werden Sie zertifizierter Guide",
          guide_reg_desc:
            "Treten Sie unserem Netzwerk professioneller Guides bei und teilen Sie Ihre Leidenschaft für die lokale Kultur.",
          benefit_title_1: "Premium-Einkommen",
          benefit_desc_1: "Top-Guides verdienen 200-500 $ pro Tag.",
          benefit_title_2: "Verifiziert & Vertrauenswürdig",
          benefit_desc_2: "Der Verifizierungsprozess schafft Vertrauen.",
          benefit_title_3: "Globale Reichweite",
          benefit_desc_3: "Verbinden Sie sich mit Reisenden aus aller Welt.",
          benefit_title_4: "Berufliches Wachstum",
          benefit_desc_4: "Zugang zu Schulungsprogrammen.",
          start_application: "Bewerbung starten",
          guide_requirements_title: "Anforderungen für Guides",
          req_1: "Gültiger Ausweis und Wohnsitznachweis",
          req_2: "Mindestens 2 Jahre Erfahrung",
          req_3: "Fließend Englisch + Landessprache",
          req_4: "Erste-Hilfe-Zertifikat",
          req_5: "Sauberes Führungszeugnis",
          req_6: "Berufliche Referenzen",
          app_process_title: "Bewerbungsprozess",
          app_step_1: "1. Online-Bewerbung (5 Min.)",
          app_step_2: "2. Dokumentenprüfung (2-3 Tage)",
          app_step_3: "3. Video-Interview",
          app_step_4: "4. Hintergrundüberprüfung",
          app_step_5: "5. Willkommen bei BookMyTourGuide!",
          booking_proc_title: "Einfacher Buchungsprozess",
          booking_proc_desc: "Buchen Sie Ihre perfekte Tour in wenigen Klicks.",
          step_1_title: "Erlebnis wählen",
          step_1_desc: "Wählen Sie aus unseren Touren Ihren Guide.",
          step_1_details: "Filtern nach Ort, Sprache, Preis.",
          step_2_title: "Datum & Uhrzeit wählen",
          step_2_desc: "Prüfen Sie die Verfügbarkeit in Echtzeit.",
          step_2_details: "Sofortige Bestätigung.",
          step_3_title: "Sichere Zahlung",
          step_3_desc: "Zahlen Sie sicher mit unserem System.",
          step_3_details: "Nur 20-30% Anzahlung.",
          step_4_title: "Bestätigung & Treffen",
          step_4_desc:
            "Erhalten Sie eine Bestätigung und treffen Sie Ihren Guide.",
          step_4_details: "Erhalten Sie Kontaktdaten und Treffpunkt.",
          feature_1_title: "4,9/5 Durchschnitt",
          feature_1_desc: "Basierend auf 10.000+ Bewertungen.",
          feature_2_title: "Lokale Expertise",
          feature_2_desc: "Alle Guides sind Einheimische.",
          feature_3_title: "100% verifiziert",
          feature_3_desc: "Jeder Guide besteht unseren Verifizierungsprozess.",
          testimonials_title_community: "Stimmen aus unserer Community",
          testimonials_desc: "Echte Geschichten von Reisenden in Indien.",
          no_testimonials: "Keine Erfahrungsberichte verfügbar.",
          stat_happy_travelers: "Zufriedene Reisende",
          stat_total_reviews: "Bewertungen insgesamt",
          stat_expert_guides: "Experten-Guides",
          stat_avg_rating: "Durchschnitt",
          video_unavailable: "Video nicht verfügbar",
          footer_company_subtitle: "Professioneller Tourismus",
          footer_company_description:
            "Verbindet Reisende mit zertifizierten lokalen Guides für authentische und sichere Erlebnisse.",
          footer_available_languages: "Verfügbar in 15+ Sprachen",
          footer_tour_types: "Tourarten",
          footer_destinations: "Beliebte Ziele",
          footer_support: "Support",
          footer_stay_updated: "Bleiben Sie auf dem Laufenden",
          footer_newsletter_prompt: "Erhalten Sie die neuesten Angebote.",
          footer_email_placeholder: "Geben Sie Ihre E-Mail-Adresse ein",
          footer_subscribe: "Abonnieren",
          footer_copyright: "© 2024 BookMyTourGuide. Alle Rechte vorbehalten.",
          footer_legal_links: "Datenschutz | Nutzungsbedingungen",

          help_center: "Hilfezentrum",
          safety_guidelines: "Sicherheitsrichtlinien",
          privacy_policy: "Datenschutzrichtlinie",
          refund_and_cancellation: "Rückerstattung und Stornierung",
          terms_and_conditions: "Allgemeine Geschäftsbedingungen",
          guide_verification: "Guide-Verifizierung",
          customer_support: "Kundensupport",

          about_platform_title: "Über",
          about_platform_p1:
            "IndiaTourManager.com ist eine digitale Plattform, die zertifizierte sprachkundige Reiseführer aus ganz Indien mit internationalen Reisenden verbindet.",
          about_platform_p2:
            "Unsere Mission ist es, Indiens Reiseführer zu stärken, das Besuchererlebnis zu verbessern und authentischen, verantwortungsvollen Tourismus zu fördern.",
          about_platform_p3:
            "Wir vereinen ein Netzwerk qualifizierter Führer, die staatliche Zertifizierungsprogramme bestanden haben. Ausländische Reisende können direkt Führer auswählen und kontaktieren, die ihren Bedürfnissen entsprechen.",
          about_stat_guides: "Zertifizierte Guides",
          about_stat_cities: "Abgedeckte Städte",
          about_card_gov: "Regierung",
          about_card_cert: "Zertifiziert",
          about_card_lic: "Lizenziert & Verifiziert",
          aims_header: "Unsere Ziele",
          aims_title: "Ziele & Absichten",
          aims_p1:
            "Unsere strategischen Ziele leiten jede Entscheidung und gewährleisten eine bedeutende Wirkung für Guides und Reisende.",
          aims_obj_1:
            "Ein transparentes und direktes Beschäftigungssystem für lizenzierte Reiseführer in Indien zu schaffen",
          aims_obj_2:
            "Den indischen Tourismus weltweit durch professionelle und sprachliche Expertise zu fördern",
          aims_obj_3:
            "Die Zufriedenheit der Besucher durch authentische und gut geführte Erlebnisse zu steigern",
          aims_obj_4:
            "Sicherzustellen, dass Führer faire und pünktliche Zahlungen ohne Zwischenhändler erhalten",
          aims_obj_5:
            "Zur indischen Tourismuswirtschaft beizutragen, indem zertifizierte Fachkräfte gestärkt werden",
          gt_header: "Besonderer Fokus",
          gt_title: "Unser besonderer Fokus – Das Goldene Dreieck",
          gt_p1:
            "Das Goldene Dreieck – Delhi, Agra und Jaipur – bildet das Herzstück des indischen Tourismus.",
          gt_p2:
            "Bei IndiaTourManager.com sind wir darauf spezialisiert, die besten professionellen Guides für diese Region anzubieten.",
          gt_stat_cities: "Ikonische Städte",
          gt_stat_exp: "Erlebnisse",
          gt_overlay_title: "Das Goldene Dreieck",
          gt_overlay_feat1: "Kulturerbestätten",
          gt_overlay_feat2: "Fotomotive",
          mission_vision_header: "Unser Zweck",
          mission_vision_title: "Leitbild & Vision",
          mission_title: "Mission",
          vision_p:
            "Indiens vertrauenswürdigste Online-Plattform für die Buchung professioneller Reiseführer zu werden.",
          why_choose_header: "Warum Sie uns wählen sollten",
          why_choose_title:
            "Warum Sie IndiaTourManager.com wählen oder sich dort anmelden sollten",
          reason_1_title: "Direkter Zugang",
          reason_1_desc:
            "Verbinden Sie sich direkt mit lizenzierten Guides – keine Agenturen oder Vermittler.",
          reason_2_title: "Faire Preise",
          reason_2_desc: "Zahlen Sie direkt an den Guide.",
          reason_3_title: "Sprachkenntnisse",
          reason_3_desc: "Wählen Sie Guides, die Ihre Sprache sprechen.",
          reason_4_title: "Rundum-Reiseunterstützung",
          reason_4_desc:
            "Passen Sie Ihre gesamte Reise auf einer Plattform an.",
          reason_5_title: "Kostenloses YouTube-Video",
          reason_5_desc: "Erhalten Sie ein kostenloses Reisevideo.",
          reason_6_title: "Verifizierte Fachleute",
          reason_6_desc: "Jeder Guide ist staatlich geprüft.",
          reason_7_title: "Authentisches Erlebnis",
          reason_7_desc: "Reisen Sie mit Zuversicht.",
          reason_8_title: "Expertenwissen",
          reason_8_desc: "Profitieren Sie von Guides mit tiefem Fachwissen.",
          why_guide_header: "Zertifizierte Exzellenz",
          why_guide_title:
            "Warum die Anstellung eines registrierten Reiseführers notwendig ist",
          why_guide_p:
            "Entdecken Sie, warum die Wahl zertifizierter, staatlich anerkannter Reiseführer das hochwertigste Reiseerlebnis in ganz Indien gewährleistet.",
          why_guide_reason_1_title: "Staatliche Zulassung",
          why_guide_reason_1_desc:
            "Jeder Guide auf unserer Plattform ist von der indischen Regierung lizenziert.",
          why_guide_reason_2_title: "Sprachkenntnisse",
          why_guide_reason_2_desc:
            "Unsere Guides sprechen mehrere Fremdsprachen fließend.",
          why_guide_reason_3_title: "Sicherheit & Vertrauen",
          why_guide_reason_3_desc:
            "Autorisierte Guides schützen Touristen vor Betrug.",
          why_guide_reason_4_title: "Kulturelle Genauigkeit",
          why_guide_reason_4_desc: "Lizenzierte Guides bieten echte Einblicke.",
          why_guide_reason_5_title: "Transparenz",
          why_guide_reason_5_desc:
            "Zahlungen gehen direkt vom Kunden an den Guide.",
          yt_header: "Erinnerungsfunktion",
          yt_title: "Unsere YouTube-Erinnerungsfunktion",
          yt_p1:
            "Um Ihre Reise unvergesslich zu machen, bieten wir einen kostenlosen Video-Erinnerungsservice an.",
          yt_p2:
            "Während Ihrer Tour kann Ihr Guide Clips aufnehmen, die später bearbeitet und auf YouTube hochgeladen werden, sodass Sie:",
          yt_feat_1: "Ihre Reise jederzeit noch einmal erleben",
          yt_feat_2: "Sie einfach mit Ihren Lieben teilen",
          yt_feat_3: "Ihre Reisegeschichte für immer bewahren",
          yt_p3:
            "Dieser Service ist unsere Art, Ihrer Reise eine persönliche Note zu verleihen.",
          yt_overlay_title: "Kostenloser Videoservice",
          // ================================= TOURS PAGE =================================
          tours_badge: "Touren Erkunden",
          tours_title: "Entdecken Sie Indiens Verborgene Schätze",
          tours_desc:
            "Durchsuchen Sie kuratierte Erlebnisse, die von verifizierten lokalen Guides geleitet werden, und entdecken Sie das Herz jedes Reiseziels.",
          tours_search_placeholder: "Suche nach Name oder Beschreibung...",
          tours_filter_placeholder: "Nach Ort filtern",
          tours_all_locations: "Alle Orte",
          tours_failed_title: "Laden der Touren Fehlgeschlagen",
          tours_not_found_title: "Keine Touren Gefunden",
          tours_not_found_desc:
            "Versuchen Sie, Ihre Suche oder Filter anzupassen.",
          // ================================= FIND GUIDES PAGE =================================
          find_guides_badge: "Mit Experten Erkunden",
          find_guides_title: "Finden Sie Ihren Perfekten Lokalen Guide",
          find_guides_desc:
            "Wählen Sie einen Ort und eine Sprache aus, um sich mit unseren zertifizierten, professionellen Reiseführern zu verbinden.",
          find_guides_card_title: "Entdecken Sie Ihren Guide",
          find_guides_card_desc:
            "Beginnen Sie mit der Auswahl Ihres gewünschten Ziels und Ihrer Sprache.",
          find_guides_destination_label: "Reiseziel",
          find_guides_destination_placeholder: "Wählen Sie einen Ort",
          find_guides_language_label: "Sprache",
          find_guides_language_placeholder: "Wählen Sie eine Sprache",
          find_guides_button: "Guides Finden",
          find_guides_error_title: "Fehler beim Laden der Guides",
          find_guides_try_again: "Erneut Versuchen",
          find_guides_results_title: "Treffen Sie Ihre Experten-Guides",
          find_guides_not_found_title: "Keine Guides Gefunden",
          find_guides_not_found_desc:
            "Leider entsprechen keine Guides Ihren ausgewählten Kriterien. Bitte versuchen Sie eine andere Kombination.",
          find_guides_new_search: "Neue Suche Starten",
          find_guides_book_button: "Ansehen & Buchen",
          // ================================= BECOME A GUIDE PAGE =================================
          guide_page_badge: "Treten Sie unserem Netzwerk bei",
          guide_page_title: "Werden Sie BookMyTourGuide-Partner",
          guide_page_desc:
            "Stärken Sie Reisende mit Ihrem lokalen Wissen und verdienen Sie, während Sie die einzigartigen Geschichten Ihrer Stadt teilen.",
          guide_page_why_join: "Warum BookMyTourGuide beitreten?",
          guide_page_benefit_1_title: "Verdienen Sie 500-2000 ₹/Stunde",
          guide_page_benefit_1_desc:
            "Legen Sie Ihre eigenen Preise fest und erzielen Sie ein wettbewerbsfähiges Einkommen.",
          guide_page_benefit_2_title: "Flexibler Zeitplan",
          guide_page_benefit_2_desc:
            "Arbeiten Sie, wann Sie wollen, und wählen Sie Ihre eigenen Touren.",
          guide_page_benefit_3_title: "Berufliches Wachstum",
          guide_page_benefit_3_desc:
            "Bauen Sie Ihren Ruf auf und erweitern Sie Ihr Netzwerk.",
          guide_page_benefit_4_title: "Verifizierte Plattform",
          guide_page_benefit_4_desc:
            "Treten Sie unserer vertrauenswürdigen Gemeinschaft von zertifizierten Guides bei.",
          guide_page_requirements_title: "Unsere Anforderungen",
          guide_page_what_we_look_for: "Was wir suchen",
          guide_page_req_1: "Gültiger amtlicher Ausweis",
          guide_page_req_2: "Mindestens 2 Jahre Erfahrung als Guide",
          guide_page_req_3:
            "Fließend Englisch und mindestens eine lokale Sprache",
          guide_page_req_4: "Tiefes Wissen über lokale Geschichte und Kultur",
          guide_page_req_5: "Eine professionelle und freundliche Einstellung",
          guide_page_req_6: "Ein Smartphone mit Internetzugang",
          guide_page_verification_title: "Unser Verifizierungsprozess",
          guide_page_step_1:
            "Reichen Sie eine Online-Bewerbung mit Ihren Unterlagen ein.",
          guide_page_step_2:
            "Unser Team führt eine Hintergrundprüfung und ein kurzes Online-Interview durch.",
          guide_page_step_3:
            "Schließen Sie unsere Plattforms-Schulung ab und lassen Sie sich zertifizieren.",
          guide_page_step_4:
            "Aktivieren Sie Ihr Profil und erhalten Sie Tour-Buchungen!",
          guide_page_cta_title: "Bereit, Ihr nächstes Abenteuer zu führen?",
          guide_page_cta_desc:
            "Beginnen Sie noch heute Ihre Reise als professioneller Guide. Klicken Sie auf die Schaltfläche unten, um den Registrierungsprozess zu starten und einer leidenschaftlichen Community beizutreten.",
          guide_page_cta_button:
            "Werden Sie ein verifizierter zertifizierter Reiseführer",
          // German
          how_badge: "So Funktioniert's",
          how_title: "Einfache Schritte zur Planung Ihrer Perfekten Reise",
          how_desc:
            "Von der Auswahl eines Guides bis zur Buchung Ihres nächsten Abenteuers – entdecken Sie, wie einfach es ist, mit BookMyTourGuide zu reisen.",
          how_section_1_title:
            "Buchen Sie Ihre Perfekte Tour in 4 Einfachen Schritten",
          how_step_1_title: "Suchen & Stöbern",
          how_step_1_desc:
            "Stöbern Sie in unserer kuratierten Auswahl an Touren und Guides basierend auf Ihren Interessen, Ihrem Standort und Ihren Daten.",
          how_step_1_detail_1: "Filtern nach Tourtyp, Ort und Preis",
          how_step_1_detail_2: "Lesen Sie Guide-Profile und Bewertungen",
          how_step_1_detail_3: "Detaillierte Reiserouten anzeigen",
          how_step_1_detail_4: "Verfügbarkeit in Echtzeit prüfen",
          how_step_2_title: "Wählen Sie Ihren Guide",
          how_step_2_desc:
            "Wählen Sie aus unseren verifizierten lokalen Guides, die Ihren Vorlieben entsprechen.",
          how_step_2_detail_1: "Alle Guides sind überprüft",
          how_step_2_detail_2:
            "Bewertungen und authentische Rezensionen ansehen",
          how_step_2_detail_3: "Sprachpräferenzen prüfen",
          how_step_2_detail_4: "Spezialisierungsgebiete einsehen",
          how_step_3_title: "Sichere Buchung",
          how_step_3_desc:
            "Buchen Sie Ihre Tour mit einer kleinen Anzahlung. Zahlen Sie den Rest nach der Tour.",
          how_step_3_detail_1: "Zahlen Sie nur 20-30% im Voraus",
          how_step_3_detail_2: "Sicheres Zahlungsgateway",
          how_step_3_detail_3: "Sofortige Buchungsbestätigung",
          how_step_3_detail_4: "Kostenlose Stornierung bis 24 Stunden vorher",
          how_step_4_title: "Genießen Sie Ihre Tour",
          how_step_4_desc:
            "Treffen Sie Ihren Guide am vereinbarten Ort und beginnen Sie Ihr Abenteuer.",
          how_step_4_detail_1: "GPS-Tracking für Sicherheit",
          how_step_4_detail_2: "24/7 Notfall-Support",
          how_step_4_detail_3: "Flexible Tour-Anpassung",
          how_step_4_detail_4: "Professioneller Guide-Service",
          how_payment_title: "Transparenter Zahlungsprozess",
          how_payment_step_1_title: "Anzahlung",
          how_payment_step_1_desc: "Zahlen Sie 20-30% zur Bestätigung",
          how_payment_step_1_timing: "Bei Buchung",
          how_payment_step_2_title: "Tour-Abschluss",
          how_payment_step_2_desc: "Genießen Sie Ihr Tour-Erlebnis",
          how_payment_step_2_amount: "Erlebnis",
          how_payment_step_2_timing: "Während der Tour",
          how_payment_step_3_title: "Restzahlung",
          how_payment_step_3_desc: "Zahlen Sie den Restbetrag an den Guide",
          how_payment_step_3_timing: "Nach der Tour",
          how_payment_step_4_title: "Bewerten",
          how_payment_step_4_desc: "Teilen Sie Ihre Erfahrung",
          how_payment_step_4_amount: "Feedback",
          how_payment_step_4_timing: "Nach der Tour",
          how_payment_footer:
            "Sichere Zahlungen • Keine versteckten Kosten • Volle Rückerstattung",
          how_safety_title: "Ihre Sicherheit ist Unsere Priorität",
          how_safety_feat_1_title: "Verifizierte Guides",
          how_safety_feat_1_desc:
            "Hintergrundprüfungen, ID-Verifizierung und Schulung",
          how_safety_feat_2_title: "24/7 Support",
          how_safety_feat_2_desc:
            "Notfall-Hotline während Ihrer gesamten Tour verfügbar",
          how_safety_feat_3_title: "GPS-Tracking",
          how_safety_feat_3_desc:
            "Standortfreigabe in Echtzeit für zusätzliche Sicherheit",
          how_safety_feat_4_title: "Qualitätssicherung",
          how_safety_feat_4_desc: "Regelmäßige Überwachung und Feedback-System",
          how_for_guides_title: "Möchten Sie ein Guide werden?",
          how_guide_step_1_title: "Bewerbung",
          how_guide_step_1_desc:
            "Reichen Sie Ihr Profil und Ihre Dokumente ein",
          how_guide_step_2_title: "Verifizierung",
          how_guide_step_2_desc: "Hintergrundprüfung und Interview",
          how_guide_step_3_title: "Schulung",
          how_guide_step_3_desc:
            "Schließen Sie unser Zertifizierungsprogramm ab",
          how_guide_step_4_title: "Live Gehen",
          how_guide_step_4_desc: "Beginnen Sie, Buchungen zu erhalten",
          how_for_guides_button: "Bewerben Sie sich als Guide",
          how_faq_title: "Häufig Gestellte Fragen",
          how_faq_travelers: "Für Reisende",
          how_faq_q1: "Kann ich meine Buchung stornieren?",
          how_faq_a1:
            "Ja, kostenlose Stornierung bis zu 24 Stunden vor der Tour.",
          how_faq_q2: "Sind die Guides verifiziert?",
          how_faq_a2: "Alle Guides durchlaufen Überprüfungen.",
          how_faq_q3: "Was ist, wenn ich Hilfe brauche?",
          how_faq_a3: "Ein 24/7-Notfallsupport ist verfügbar.",
          how_faq_guides: "Für Guides",
          how_faq_q4: "Wie viel kann ich verdienen?",
          how_faq_a5: "Die Zahlung erfolgt direkt nach der Tour.",
          how_faq_q6: "Kann ich meinen eigenen Zeitplan festlegen?",
          how_faq_a6: "Ja, Sie haben die volle Kontrolle.",
          how_cta_title: "Bereit, Ihre Reise zu Beginnen?",
          how_cta_desc:
            "Schließen Sie sich Tausenden von Reisenden an, die Indien entdeckt haben.",
          how_cta_button1: "Buchen Sie Ihre Erste Tour",
          how_cta_button2: "Alle Touren Erkunden",
          //contact
        },
      };
      let translation = translations[language]?.[key] || key;
      if (replacements) {
        Object.keys(replacements).forEach((placeholder) => {
          translation = translation.replace(
            `{${placeholder}}`,
            String(replacements[placeholder]),
          );
        });
      }
      return translation;
    },
    [language],
  );

  const value: LanguageContextType = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
