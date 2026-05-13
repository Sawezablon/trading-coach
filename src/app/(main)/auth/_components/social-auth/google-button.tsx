import { siGoogle } from "simple-icons";

import { googleLoginAction } from "@/app/(main)/auth/actions";
import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GoogleButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <form action={googleLoginAction}>
      <Button type="submit" variant="secondary" className={cn(className)} {...props}>
        <SimpleIcon icon={siGoogle} className="size-4" />
        Continue with Google
      </Button>
    </form>
  );
}
