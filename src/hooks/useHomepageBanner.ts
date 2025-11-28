import { useEffect, useState } from "react";
import { Course } from "@/types/course";
import { siteConfigRepository } from "@/lib/repositories/siteConfigRepository";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { HomepageBannerItem } from "@/types/siteConfig";

type BannerItemResolved = Course & {
  type: "course" | "lesson";
  lessonId?: string;
  lessonTitle?: string;
  lessonStartDate?: string;
};

interface Speaker {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  bio?: string;
}

export interface BannerCourse extends Course {
  speakers?: Speaker[];
  type: "course" | "lesson";
  lessonId?: string;
  lessonTitle?: string;
  lessonStartDate?: string;
}

interface UseHomepageBannerResult {
  courses: BannerCourse[];
  loading: boolean;
  error: string | null;
}

export function useHomepageBanner(): UseHomepageBannerResult {
  const [courses, setCourses] = useState<BannerCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBannerCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const config = await siteConfigRepository.getHomepageConfig();
        const bannerItems = config?.bannerItems ?? [];

        if (bannerItems.length === 0) {
          setCourses([]);
          return;
        }

        const allCourses = await courseRepository.findPublished();
        const resolveBannerItem = async (item: HomepageBannerItem): Promise<BannerItemResolved | null> => {
          if (item.type === "lesson") {
            try {
              const lessonDoc = await getDoc(doc(db, "lessons", item.id));
              if (!lessonDoc.exists()) return null;
              const lessonData = lessonDoc.data();
              if (!lessonData?.courseId) return null;
              const course = await courseRepository.findById(lessonData.courseId);
              if (!course) return null;
              const lessonStart = lessonData.startDate || lessonData.scheduledStartTime;
              return {
                ...course,
                startDate: lessonStart || course.startDate,
                endDate: lessonStart || course.endDate,
                type: "lesson",
                lessonId: item.id,
                lessonTitle: lessonData.title,
                lessonStartDate: lessonStart,
              } as BannerItemResolved;
            } catch (err) {
              console.error(`Error fetching lesson ${item.id}`, err);
              return null;
            }
          }

          const course = allCourses.find((course) => course.id === item.id);
          if (!course) return null;
          return { ...course, type: "course" } as BannerItemResolved;
        };

        const resolvedItems = await Promise.all(bannerItems.map((item) => resolveBannerItem(item)));
        const bannerCourses = resolvedItems.filter((item): item is BannerItemResolved => Boolean(item));

        const coursesWithSpeakers = await Promise.all(
          bannerCourses.map(async (course: BannerItemResolved) => {
            if (!course.speakerIds || course.speakerIds.length === 0) {
              return { ...course, speakers: [], type: course.type, lessonId: course.lessonId, lessonTitle: course.lessonTitle, lessonStartDate: course.lessonStartDate };
            }

            const speakers: Speaker[] = [];
            for (const speakerId of course.speakerIds) {
              try {
                const speakerDoc = await getDoc(doc(db, "speakers", speakerId));
                if (speakerDoc.exists()) {
                  const data = speakerDoc.data() as any;
                  speakers.push({
                    id: speakerId,
                    name: `${data.name || ''} ${data.lastName || ''}`.trim() || data.email,
                    email: data.email,
                    photoURL: data.avatarUrl || data.photoURL, // Usar avatarUrl de Firestore
                    bio: data.bio,
                  });
                }
              } catch (err) {
                console.error(`Error fetching speaker ${speakerId} for course ${course.id}`, err);
              }
            }

            return { ...course, speakers, type: course.type, lessonId: course.lessonId, lessonTitle: course.lessonTitle, lessonStartDate: course.lessonStartDate };
          })
        );

        setCourses(coursesWithSpeakers);
      } catch (err) {
        console.error("Error loading homepage banner courses", err);
        setError("No se pudieron cargar los cursos destacados");
      } finally {
        setLoading(false);
      }
    };

    loadBannerCourses();
  }, []);

  return { courses, loading, error };
}
