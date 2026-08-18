interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
}

export function Avatar({ url, name, size = 32 }: AvatarProps) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="avatar-image"
        style={{ width: size, height: size }}
      />
    );
  }

  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="avatar-fallback"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
