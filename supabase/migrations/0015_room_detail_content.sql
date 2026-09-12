alter table public.resources
  add column overview text,
  add column amenities text[];

update public.resources
set
  overview = 'A cozy studio unit on Mactan Island, fully furnished with a kitchenette and fast wifi — ideal for a couple''s getaway or a short stay.',
  amenities = array['Air Conditioning', 'Refrigerator', 'High-Speed Wi-Fi', 'Microwave', 'Kitchenware']
where label = 'Studio Unit A';

update public.resources
set
  overview = 'A cozy studio unit on Mactan Island, fully furnished with a kitchenette and fast wifi — ideal for a couple''s getaway or a short stay.',
  amenities = array['Air Conditioning', 'Refrigerator', 'High-Speed Wi-Fi', 'Microwave', 'Kitchenware']
where label = 'Studio Unit B';

update public.resources
set
  overview = 'Room for the whole family — two bedrooms, a full kitchen, and space to relax after a day exploring Mactan Island.',
  amenities = array['Air Conditioning', 'Refrigerator', 'High-Speed Wi-Fi', 'Washing Machine', 'Microwave', 'Kitchenware']
where label = '2-Bedroom Unit';
