import { redirect } from "next/navigation";

// Safety net: if someone lands on /forum/p without an id, send them back to the feed.
export default function PostIndexRedirect() {
  redirect("/forum");
}
