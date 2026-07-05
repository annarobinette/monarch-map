// js/data-loader.js
// Loads the monarch/location dataset from Supabase and normalizes it into the
// flat shape the map and list pages expect: { people, monarchs, locations, burials, houseColors }

async function loadAndProcessData() {
    try {
        const [houses, people, monarchs, locations, burials, relationships, parentage] = await Promise.all([
            supa.select('houses', 'select=house,colour'),
            supa.select('people', 'select=*'),
            supa.select('monarchs', 'select=*'),
            supa.select('locations', 'select=*'),
            supa.select('burials', 'select=*'),
            supa.select('relationships', 'select=*'),
            supa.select('parentage', 'select=*')
        ]);

        const houseColors = {};
        houses.forEach(h => { houseColors[h.house] = h.colour; });
        houseColors['Default'] = '#333333';

        const peopleByIdRaw = new Map(people.map(p => [p.person_id, p]));
        const monarchIds = new Set(monarchs.map(m => m.person_id));

        const spousesByMonarch = new Map();
        relationships.forEach(r => {
            const consort = peopleByIdRaw.get(r.consort_id);
            if (!consort) return;
            const list = spousesByMonarch.get(r.monarch_id) || [];
            list.push({ name: consort.name, relationship_type: r.relationship_role });
            spousesByMonarch.set(r.monarch_id, list);
        });

        const issueByParent = new Map();
        parentage.forEach(pg => {
            const child = peopleByIdRaw.get(pg.child_id);
            if (!child) return;
            const list = issueByParent.get(pg.parent_id) || [];
            list.push({ name: child.name, code: pg.child_id });
            issueByParent.set(pg.parent_id, list);
        });

        const locationsById = new Map(locations.map(l => [l.location_id, l]));
        const burialsByPerson = new Map();
        burials.forEach(b => {
            const list = burialsByPerson.get(b.person_id) || [];
            list.push(b);
            burialsByPerson.set(b.person_id, list);
        });

        function placeOfBurial(personId) {
            const list = burialsByPerson.get(personId) || [];
            const names = [...new Set(list.map(b => (locationsById.get(b.location_id) || {}).location_name).filter(Boolean))];
            return names.join('; ') || null;
        }

        const monarchsByPersonId = new Map(monarchs.map(m => [m.person_id, m]));

        const peopleOut = monarchs.map(m => {
            const person = peopleByIdRaw.get(m.person_id) || {};
            return {
                person_id: m.person_id,
                name: person.name,
                title: m.title,
                house: person.house,
                country: m.country,
                isMonarch: true,
                birth_date: person.birth_date,
                death_date: person.death_date,
                reign_1_start: m.reign_1_start,
                reign_1_end: m.reign_1_end,
                reign_2_start: m.reign_2_start,
                reign_2_end: m.reign_2_end,
                place_of_burial: placeOfBurial(m.person_id),
                spouses: spousesByMonarch.get(m.person_id) || [],
                issue: issueByParent.get(m.person_id) || []
            };
        });

        const locationsOut = locations.map(l => ({
            location_id: l.location_id,
            location_name: l.location_name,
            city: l.city,
            map_latitude: l.map_latitude,
            map_longitude: l.map_longitude,
            floorplan_image_path: l.floorplan_image_path,
            burials: (burials.filter(b => b.location_id === l.location_id)).map(b => ({
                person_id: b.person_id,
                location_id: b.location_id,
                body_part: b.sub_location_name || (b.body_part !== 'Whole Body' ? b.body_part : null),
                floorplan_x: b.floorplan_x,
                floorplan_y: b.floorplan_y,
                notes: b.notes,
                monarch_name: (peopleByIdRaw.get(b.person_id) || {}).name
            }))
        }));

        const burialsOut = burials
            .filter(b => monarchIds.has(b.person_id))
            .map(b => ({ person_id: b.person_id, location_id: b.location_id }));

        return { people: peopleOut, monarchs: peopleOut, locations: locationsOut, burials: burialsOut, houseColors };

    } catch (error) {
        console.error('Failed to load monarch data from Supabase:', error);
        return null;
    }
}
