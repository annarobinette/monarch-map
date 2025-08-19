// js/data-loader.js - Definitive Final Version

async function loadAndProcessData() {
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby3l5meHbJCcIdiNDkA21IK8t9nZQSCIEM6vuGzc2VLfsYz1sVXhXZOdUg-CkDMAV4zlQ/exec'; 

    

    try {
        const response = await fetch(WEB_APP_URL);
        if (!response.ok) throw new Error(`Network response was not ok`);
        
        const rawData = await response.json();

        if (!rawData.houseData) { // UPDATED to use houseData
            throw new Error("Data for 'houseData' not found. Check sheet names and Apps Script.");
        }

        const houseColors = {};
        rawData.houseData.forEach(house => { // UPDATED to use houseData
            if (house.house && house.colour) {
                houseColors[house.house] = house.colour;
            }
        });
        houseColors['Default'] = '#777777';

        const allData = { monarchs: {}, locations: {} };
        const peopleMap = new Map(rawData.people.map(p => [p.person_code, p]));
        
        rawData.locations.forEach(loc => {
            allData.locations[loc.location_id] = { 
                ...loc, 
                burials: rawData.burials.filter(b => b.location_id === loc.location_id)
            };
        });

        rawData.monarchs.forEach(monarchData => {
            const monarchCode = monarchData.monarch_code;
            if (!monarchCode) return;

            const personDetails = peopleMap.get(monarchCode) || {};
            let monarch = { ...personDetails, ...monarchData };
            monarch.spouses = [];
            monarch.issue = [];
            monarch.burial_details = rawData.burials.filter(b => b.monarch_code === monarchCode);
            
            (rawData.relationships || [])
                .filter(r => r.person1_code === monarchCode)
                .forEach(rel => {
                    const spouseDetails = peopleMap.get(rel.person2_code);
                    if (spouseDetails) monarch.spouses.push({ ...spouseDetails, relationship_type: rel.relationship_type });
                });

            (rawData.parentage || [])
                .filter(p => p.parent_code === monarchCode)
                .forEach(p => {
                    const childDetails = peopleMap.get(p.child_code);
                    if (childDetails) {
                        const isMonarch = rawData.monarchs.some(m => m.monarch_code === childDetails.person_code);
                        monarch.issue.push({
                            code: childDetails.person_code,
                            name: childDetails.name,
                            is_monarch: isMonarch
                        });
                    }
                });
            
            allData.monarchs[monarchCode] = monarch;
        });

        console.log("Live data from Apps Script processed successfully!");
        return { allData, houseColors };

    } catch (error) {
        console.error("Failed to load or process live data from Google Apps Script:", error);
        alert("Failed to load data. Please check the developer console for details.");
        return null; 
    }
}
