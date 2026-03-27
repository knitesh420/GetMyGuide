// components/EditGuideSheet.tsx
"use client";

import { GuideProfile } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Calendar, Globe, Star, BookOpen, Briefcase, Languages, CheckCircle, XCircle, Trash2 } from "lucide-react";

// Helper component for consistent display (no changes needed here)
const InfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | string[] | number | undefined | null }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    return (
        <div className="flex items-start gap-3">
            <div className="mt-1 text-muted-foreground">{icon}</div>
            <div>
                <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                <p className="text-md text-foreground">{displayValue}</p>
            </div>
        </div>
    );
};

// Main component props (no changes needed here)
interface EditGuideSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  guide: GuideProfile | null;
  onDelete: (guideId: string) => void;
  onToggleApproval: () => void;
}

export function EditGuideSheet({
  isOpen,
  onOpenChange,
  guide,
  onDelete,
  onToggleApproval,
}: EditGuideSheetProps) {
  if (!guide) return null;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = '/placeholder.png';
  };
  
  const formattedExpiry = guide.subscriptionExpiresAt 
    ? new Date(guide.subscriptionExpiresAt).toLocaleDateString()
    : 'N/A';

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">{guide.name}</SheetTitle>
          <SheetDescription className="flex items-center gap-4 pt-1">
            <Badge variant={guide.isApproved ? 'default' : 'destructive'}>
              {guide.isApproved ? 'Approved' : 'Pending Approval'}
            </Badge>
            {guide.isCertified && <Badge variant="secondary">Certified</Badge>}
          </SheetDescription>
        </SheetHeader>
        
        <Separator className="my-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Images */}
            <div className="space-y-6">
                <div>
                    <h4 className="font-semibold mb-2">Profile Photo</h4>
                    <img src={guide.photo || '/placeholder.png'} onError={handleImageError} alt="Guide Photo" className="w-full h-auto rounded-lg border object-cover aspect-square"/>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">License/ID</h4>
                    <img src={guide.license || '/placeholder.png'} onError={handleImageError} alt="Guide License" className="w-full h-auto rounded-lg border object-cover"/>
                </div>
            </div>

            {/* Right Column: Details */}
            <div className="space-y-4">
                 <InfoRow icon={<Mail size={16}/>} label="Email" value={guide.email} />
                 <InfoRow icon={<Phone size={16}/>} label="Mobile" value={guide.mobile} />
                 <InfoRow icon={<Calendar size={16}/>} label="Age" value={guide.age} />
                 <InfoRow icon={<Globe size={16}/>} label="Location" value={guide.state && guide.country ? `${guide.state}, ${guide.country}` : ''} />
                 <InfoRow icon={<Briefcase size={16}/>} label="Experience" value={guide.experience ? `${guide.experience} years` : ''} />
                 <InfoRow icon={<Languages size={16}/>} label="Languages" value={guide.languages} />
                 <InfoRow icon={<Star size={16}/>} label="Specializations" value={guide.specializations} />
                 <InfoRow icon={<Star size={16}/>} label="Approval Status" value={guide.isApproved? "Approved": "Not Approved"} />
                 <InfoRow icon={<BookOpen size={16}/>} label="Description" value={guide.description} />
                 
                 <Separator className="my-2"/>
                 
                 <InfoRow icon={<CheckCircle size={16} className="text-green-500"/>} label="Subscription Plan" value={guide.subscriptionPlan || "N/A"} />
                 <InfoRow icon={<Calendar size={16}/>} label="Subscription Expires" value={formattedExpiry} />
            </div>
        </div>

        {/* 
            🔥 FIX: The entire "Guide Reviews" section that was here has been removed.
            The code from line 189 to 194 in your error message is now gone.
        */}

        <SheetFooter className="mt-8 pt-6 border-t flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
            <Button variant="destructive" className="w-full sm:w-auto" onClick={() => onDelete(guide._id)}>
                <Trash2 className="w-4 h-4 mr-2"/>
                Delete Guide
            </Button>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mb-2 sm:mb-0">
                 <SheetClose asChild>
                    <Button variant="outline" className="w-full sm:w-auto">Close</Button>
                 </SheetClose>
                 <Button 
                    className="w-full sm:w-auto"
                    variant={guide.isApproved ? "secondary" : "default"}
                    onClick={onToggleApproval}
                 >
                    {guide.isApproved ? (
                        <><XCircle className="w-4 h-4 mr-2"/> Reject</>
                    ) : (
                        <><CheckCircle className="w-4 h-4 mr-2"/> Approve</>
                    )}
                 </Button>
            </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}