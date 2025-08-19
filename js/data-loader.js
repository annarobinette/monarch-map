// js/data-loader.js - Final Version using person_id

async function loadAndProcessData() {
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby3l5meHbJCcIdiNDkA21IK8t9nZQSCIEM6vuGzc2VLfsYz1sVXhXZOdUg-CkDMAV4zlQ/exec'; 

    try {
        const response = await fetch(WEB_APP_URL);
        if (!response.ok) throw new Error(`Network response was not ok`);
        const rawData = await response.json();

        if (!rawData.houseData) {
            throw new Error("Data for 'houseData' not found. Check sheet names and Apps Script.");
        }

        const houseColors = {};
        rawData.houseData.forEach(house => {
            if (house.house && house.colour) {
                houseColors[house.house] = house.colour;
            }
        });
        houseColors['Default'] = '#777777';

        const allData = { monarchs: {}, locations: {}, people: {} };
        const peopleMap = new Map((rawData.people || []).map(p => [p.person_id, p]));
        
        // This creates a dedicated map for just monarchs for easy lookup later
        const monarchMap = new Map((rawData.monarchs || []).map(m => [m.person_id, m]));

        (rawData.locations || []).forEach(loc => {
            allData.locations[loc.location_id] = { 
                ...loc, 
                burials: (rawData.burials || []).filter(b => b.location_id === loc.location_id)
            };
        });

        // Loop through all PEOPLE, and enrich them if they are also a monarch
        (rawData.people || []).forEach(person => {
            const personId = person.person_id;
            if (!personId) return;

            const monarchData = monarchMap.get(personId);
            const isMonarch = !!monarchData;

            // Combine the person's base data with their monarch-specific data
            let combinedData = isMonarch ? { ...person, ...monarchData } : { ...person };
            
            combinedData.isMonarch = isMonarch;
            combinedData.spouses = [];
            combinedData.issue = [];
            combinedData.burial_details = (rawData.burials || []).filter(b => b.person_id === personId);
            
            // Populate relationships and parentage
            (rawData.relationships || [])
                .filter(r => r.person1_id === personId)
                .forEach(rel => {
                    const spouseDetails = peopleMap.get(rel.person2_id);
                    if (spouseDetails) combinedData.spouses.push({ ...spouseDetails, relationship_type: rel.relationship_type });
                });

            (rawData.parentage || [])
                .filter(p => p.parent_id === personId)
                .forEach(p => {
                    const childDetails = peopleMap.get(p.child_id);
                    if (childDetails) {
                        combinedData.issue.push({
                            code: childDetails.person_id,
                            name: childDetails.name,
                            is_monarch: monarchMap.has(childDetails.person_id)
                        });
                    }
                });

            allData.people[personId] = combinedData;
            if (isMonarch) {
                allData.monarchs[personId] = combinedData;
            }
        });

        console.log("Live data from Apps Script processed successfully!");
        return { ...allData, houseColors };

    } catch (error) {
        console.error("Failed to load or process live data from Google Apps Script:", error);
        alert("Failed to load data. Please check the developer console for details.");
        return null; 
    }
}
