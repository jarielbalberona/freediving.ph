import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfileForm({ defaultValues }: any) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 rounded-xl border border-border/80 bg-card/60 p-6 backdrop-blur-xs">
      <div className="flex items-center justify-center gap-6">
        <div className="h-24 w-24">
        <Avatar className="h-24 w-24 rounded-full">
          <AvatarImage
            src={defaultValues?.avatar}
            className="rounded-full object-cover"
          />
          <AvatarFallback>
            SC
          </AvatarFallback>
        </Avatar>
        </div>
        <Button
          variant="outline"
          className="h-24 w-24 rounded-full"
        >
          <Sparkles className="h-6 w-6 text-muted-foreground" />
        </Button>
      </div>
      <p className="w-full cursor-pointer text-center text-sm text-muted-foreground">
        Upload / Generate a new avatar
      </p>

      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="name">
            Display Name
          </Label>
          <Input
            id="name"
            placeholder="Your full name"
            defaultValue={defaultValues?.name}
            autoComplete="off"
            className="bg-background"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="username">
            Username
          </Label>
          <Input
            id="username"
            placeholder="@username"
            defaultValue={defaultValues?.username}
            autoComplete="off"
            className="bg-background"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bio">
            Bio
          </Label>
          <Textarea
            id="bio"
            placeholder="Tell us about yourself"
            className="resize-none bg-background"
            rows={4}
            defaultValue={defaultValues?.bio}
            autoComplete="off"
          />
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">
            Social Links
          </h3>
          <div className="grid gap-4">
            {["website", "twitter", "instagram"]?.map((social) => (
              <div key={social} className="grid gap-2">
                <Label htmlFor={social} className="capitalize">
                  {social}
                </Label>
                <Input
                  id={social}
                  placeholder={
                    social === "website"
                      ? "https://your-website.com"
                      : "@username"
                  }
                  defaultValue={
                    defaultValues?.[social as keyof typeof defaultValues]
                  }
                  autoComplete="off"
                  className="bg-background"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          render={<Link href="/profile" />}
        >
          Cancel
        </Button>
        <Button
          className="hover:bg-muted"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
