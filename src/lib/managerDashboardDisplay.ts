interface ManagerPropertySizeFields {
  property_size_sqft?: number | null;
  area?: number | null;
  sqft?: number | null;
}

export const resolveManagerPropertySize = ({
  property_size_sqft,
  area,
  sqft,
}: ManagerPropertySizeFields): number => (
  property_size_sqft || area || sqft || 0
);
