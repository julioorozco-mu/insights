"use client";

import { useParams } from "next/navigation";
import { UserProfile } from "@/components/profile/UserProfile";

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.id as string;

  return <UserProfile userId={userId} isPublic={true} />;
}
