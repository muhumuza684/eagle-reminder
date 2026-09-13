import { Link } from "expo-router";
import { type ComponentProps } from "react";
import { openBrowserAsync } from "expo-web-browser";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  children?: React.ReactNode;
};

export function ExternalLink({ href, children, ...props }: Props) {
  return (
    <Link
      {...props}
      href={href as never}
      onPress={(event) => {
        event.preventDefault();
        void openBrowserAsync(href);
      }}
    >
      {children}
    </Link>
  );
}
