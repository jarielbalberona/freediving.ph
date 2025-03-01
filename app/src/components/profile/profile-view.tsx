"use client";
import MoodBoardItem from "@/components/ui/mood-board";
import { images } from "@/data/dummy";
import { useProfile } from "@/hooks/react-queries/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Grid, MessageCircle, UserPlus } from "lucide-react";

export default function ProfileView({ initialData }: any) {
  const { data: user }: any = useProfile(initialData);

  return (
    <div className="flex justify-center w-full min-h-screen bg-background">
      <div className="w-full max-w-3xl px-4 py-8 mx-auto">
        {/* Profile Header */}
        <div className="flex flex-col items-start gap-8 mb-10 md:flex-row">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 shadow-lg md:w-40 md:h-40 border-background">
              <AvatarImage
                src="/placeholder.svg?height=150&width=150"
                alt="@username"
              />
              <AvatarFallback>UN</AvatarFallback>
            </Avatar>
            <div className="absolute flex items-center justify-center w-6 h-6 bg-green-500 border-2 rounded-full -bottom-2 -right-2 border-background">
              <span className="sr-only">Online</span>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{user.username}</h1>
                <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                  Pro
                </span>
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mx-4">
                  <Button className="rounded-full">
                    <UserPlus />
                    Connect
                  </Button>
                  <Button variant="outline" className="rounded-full">
                    <MessageCircle />
                    Message
                  </Button>
                  <Button variant="secondary" className="hidden rounded-full">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2"
                    >
                      <path
                        d="M19 9l-7 7-7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    More
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Member since January 2023
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div className="p-3 rounded-lg ">
                <p className="text-xl font-semibold">542</p>
                <p className="text-xs tracking-wider uppercase text-muted-foreground">
                  Starfish
                </p>
              </div>
              <div className="p-3 rounded-lg ">
                <p className="text-xl font-semibold">13.7k</p>
                <p className="text-xs tracking-wider uppercase text-muted-foreground">
                  Followers
                </p>
              </div>
              <div className="p-3 rounded-lg ">
                <p className="text-xl font-semibold">1,258</p>
                <p className="text-xs tracking-wider uppercase text-muted-foreground">
                  Contributions
                </p>
              </div>
            </div>

            {/* Bio Section */}
            <div className="p-4 space-y-2 rounded-lg bg-background">
              <h2 className="flex items-center gap-2 font-bold">
                <span>{user.name}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-blue-500"
                >
                  <path
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-9.618 5.04L2 8c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622l-.382-.014z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </h2>
              <div className="flex flex-wrap gap-2">
                <span className="bg-primary/10 text-primary text-xs px-2.5 py-0.5 rounded-full">
                  Photographer
                </span>
                <span className="bg-primary/10 text-primary text-xs px-2.5 py-0.5 rounded-full">
                  Traveler
                </span>
                <span className="bg-primary/10 text-primary text-xs px-2.5 py-0.5 rounded-full">
                  Coffee Enthusiast
                </span>
              </div>
              <p className="text-sm">
                Capturing moments and sharing stories ✨
              </p>
              <Link
                href="#"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                www.example.com
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs and Content */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <Grid className="w-4 h-4" />
              <span className="sr-only md:not-sr-only">Posts</span>
            </TabsTrigger>
            <TabsTrigger value="reels" className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12.5v7l5-3.5-5-3.5z"
                  fill="currentColor"
                />
              </svg>
              <span className="sr-only md:not-sr-only">Reels</span>
            </TabsTrigger>
            <TabsTrigger value="tagged" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span className="sr-only md:not-sr-only">Tagged</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] auto-rows-[6px] gap-4">
              {images?.map((image, index) => (
                <MoodBoardItem key={index} image={image} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reels" className="mt-6">

          </TabsContent>

          <TabsContent value="tagged" className="mt-6">

          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
