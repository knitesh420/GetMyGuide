import React from "react";
import AdvertisementDisplay from "@/components/AdvertisementDisplay";

interface PageProps {
  children: React.ReactNode;
}

const WebsiteLayout: React.FC<PageProps> = ({ children }) => {
  return (
    <div>
      {/* Advertisement Banner - Add this at the top of your layout or specific pages */}
      <div className="w-full h-48 md:h-64 lg:h-96">
        <AdvertisementDisplay
          autoplay={true}
          muted={true}
          loop={true}
          controls={false}
        />
      </div>

      {/* Rest of your content */}
      {children}
    </div>
  );
};

export default WebsiteLayout;
