import type { WorkflowTemplate } from "./types";

export const PRJ_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "PRJ_ADMIN",
    name: "Project aanmaken en inrichten",
    category: "ALG",
    description: "Test of een nieuw project correct kan worden aangemaakt, ingedeeld in projectgroep en projectfases, en gekoppeld aan een verkooprelatie in AFAS Profit Projecten.",
    steps: [
      {
        title: "Projectgroep en projectprofiel controleren",
        instruction: "Ga naar Projecten > Beheer > Projectgroepen en verifieer dat de juiste projectgroep beschikbaar is. Controleer vervolgens via Projecten > Beheer > Projectprofielen of een passend projectprofiel bestaat met de gewenste standaardinstellingen.",
        expectedResult: "De projectgroep is zichtbaar in de lijst en het projectprofiel toont de verwachte standaardwaarden voor projectfases, werksoorten en facturatiewijze.",
      },
      {
        title: "Nieuw project aanmaken",
        instruction: "Ga naar Projecten > Project en klik op 'Nieuw'. Selecteer het projectprofiel, vul de projectcode en projectomschrijving in, koppel de verkooprelatie (debiteur) en stel de start- en einddatum in. Sla het project op.",
        expectedResult: "Het project is aangemaakt met de juiste projectcode, verkooprelatie en datums. Het project heeft de status 'Offerte' of 'Order' conform het gekozen projectprofiel.",
      },
      {
        title: "Projectfases toevoegen",
        instruction: "Open het aangemaakte project via Projecten > Project, ga naar het tabblad 'Projectfases' en voeg minimaal twee projectfases toe (bijv. 'Analyse' en 'Realisatie') met bijbehorende start- en einddatums en bewakingscode.",
        expectedResult: "De projectfases zijn opgeslagen en zichtbaar op het tabblad 'Projectfases'. Iedere fase heeft een unieke bewakingscode en correcte datumrange binnen de projectperiode.",
      },
      {
        title: "Projectmedewerkers koppelen",
        instruction: "Ga in het project naar het tabblad 'Projectmedewerkers' en voeg de betrokken medewerkers toe. Wijs per medewerker een rol (bijv. Projectmanager of Consultant) en de geldige projectfases toe.",
        expectedResult: "De medewerkers zijn gekoppeld aan het project en de rollen zijn correct weergegeven. Via geldigheidscombinaties zijn medewerkers alleen bevoegd uren te boeken op de toegewezen fases.",
      },
      {
        title: "Voorcalculatie invullen",
        instruction: "Ga naar Projecten > Voorcalculatie > Voorcalculatie, selecteer het nieuwe project en voeg budgetregels toe per projectfase en werksoort. Vul de geplande uren, de kostprijs per uur en de verkoopprijs per uur in.",
        expectedResult: "De voorcalculatieregels zijn opgeslagen. Het systeem toont het totale gebudgetteerde bedrag per fase en voor het gehele project, inclusief de berekende marge.",
      },
      {
        title: "Projectstatus wijzigen naar Order",
        instruction: "Open het project via Projecten > Project en wijzig de projectstatus van 'Offerte' naar 'Order' via het veld 'Status'. Bevestig de statuswijziging.",
        expectedResult: "De projectstatus is bijgewerkt naar 'Order'. Het project is nu beschikbaar voor het boeken van nacalculatie en declaraties door projectmedewerkers.",
      },
    ],
  },
  {
    key: "PRJ_UREN",
    name: "Urenregistratie via InSite",
    category: "ALG",
    description: "Test of medewerkers via InSite uren kunnen boeken op een project met de juiste werksoort en projectfase, en of de accordering correct verloopt.",
    steps: [
      {
        title: "Urenscherm openen in InSite",
        instruction: "Log in op InSite als projectmedewerker en navigeer via het menu naar 'Projecten > Mijn uren'. Controleer dat de weekweergave of regelweergave beschikbaar is en de juiste week geselecteerd is.",
        expectedResult: "Het urenscherm opent correct en toont de huidige werkweek. De medewerker ziet alleen projecten en werksoorten waarvoor hij of zij is opgenomen via geldigheidscombinaties.",
      },
      {
        title: "Urenregel toevoegen op project",
        instruction: "Klik op 'Nieuw' of vul een dag in de kalenderweergave in. Selecteer het juiste project, de projectfase (bijv. 'Realisatie') en de werksoort (bijv. 'Advies'). Vul het aantal uren in (bijv. 6) en voeg een omschrijving toe.",
        expectedResult: "De urenregel is aangemaakt met de correcte combinatie van project, projectfase en werksoort. Profit valideert de geldigheidscombinatie en accepteert de boeking zonder foutmelding.",
      },
      {
        title: "Urenregel opslaan en indienen",
        instruction: "Sla de urenregistratie op via 'Opslaan'. Dien de uren in voor accordering door op 'Indienen' te klikken (indien accordering is ingeschakeld voor het project).",
        expectedResult: "De urenregels zijn opgeslagen en hebben de status 'Ingediend'. De medewerker ontvangt een bevestiging en kan de ingediende uren niet meer wijzigen totdat ze zijn teruggestuurd door de manager.",
      },
      {
        title: "Uren accorderen als projectmanager",
        instruction: "Log in op InSite of Profit als projectmanager. Ga naar Projecten > Nacalculatie > Accordering uren en zoek de openstaande urenstaten van de betreffende medewerker. Selecteer de regels en klik op 'Accorderen'.",
        expectedResult: "De urenregels krijgen de status 'Geaccordeerd'. De geaccordeerde uren zijn verwerkt in de nacalculatie en worden meegenomen in de projectvoortgang en budgetbewaking.",
      },
      {
        title: "Geboekte uren controleren in Profit",
        instruction: "Ga in Profit naar Projecten > Nacalculatie > Nacalculatieoverzicht en filter op het project en de betreffende week. Controleer of de geaccordeerde uren correct zijn verwerkt per projectfase en werksoort.",
        expectedResult: "De nacalculatieregels tonen de juiste medewerker, het aantal uren, de werksoort en projectfase. De kostprijsbedragen zijn automatisch berekend op basis van het ingestelde uurtarief voor de werksoort.",
      },
    ],
  },
  {
    key: "PRJ_BUDGET",
    name: "Budgetbewaking op projecten",
    category: "ALG",
    description: "Test of de budgetbewaking in AFAS Profit de afwijking tussen voorcalculatie (budget) en nacalculatie (werkelijk) correct bijhoudt en inzichtelijk maakt.",
    steps: [
      {
        title: "Voorcalculatiebudget raadplegen",
        instruction: "Ga naar Projecten > Voorcalculatie > Voorcalculatie en open het te testen project. Controleer per projectfase en werksoort de gebudgetteerde uren en bedragen (kostprijs en verkoopprijs).",
        expectedResult: "De voorcalculatieregels tonen de gebudgetteerde uren en bedragen per fase. Het totaalbudget klopt met de eerder ingevoerde waarden en de verkoopprijs overtreft de kostprijs.",
      },
      {
        title: "Werkelijk geboekte kosten inzien",
        instruction: "Ga naar Projecten > Nacalculatie > Nacalculatieoverzicht en filter op het project en de gewenste periode. Controleer de geboekte uren en kosten per projectfase en werksoort.",
        expectedResult: "De nacalculatieregels geven een actueel overzicht van de werkelijk bestede uren en kosten. Bedragen zijn berekend op basis van de ingestelde kostprijstarieven.",
      },
      {
        title: "Budget vs. werkelijk vergelijken",
        instruction: "Open het project via Projecten > Project en ga naar het tabblad 'Projectresultaten'. Bekijk de kolommen 'Voorcalculatie', 'Nacalculatie' en 'Restant budget' per bewakingscode.",
        expectedResult: "Het scherm toont per bewakingscode de gebudgetteerde uren en kosten, de werkelijk geboekte uren en kosten en het resterende budget. Afwijkingen zijn direct zichtbaar als positief of negatief restant.",
      },
      {
        title: "Budgetoverschrijding simuleren en signaal controleren",
        instruction: "Boek via Projecten > Nacalculatie > Nacalculatie boeken een extra kostenregel waarmee het budget van een projectfase wordt overschreden. Sla de boeking op en controleer het projectresultatenoverzicht.",
        expectedResult: "Profit toont een waarschuwing of markeert de overschreden fase zichtbaar in het projectresultatenoverzicht. Het restant budget voor de betrokken bewakingscode staat op een negatief bedrag.",
      },
      {
        title: "Budgetoverzicht exporteren",
        instruction: "Ga naar Projecten > Projectresultaten of het projectendashboard. Klik op 'Exporteren naar Excel' om een overzicht te genereren van budget versus werkelijk voor het project per fase en bewakingscode.",
        expectedResult: "Het systeem genereert een Excel-bestand met kolommen voor voorcalculatie, nacalculatie en restant per fase en bewakingscode. Het bestand is foutloos te openen en bevat actuele cijfers.",
      },
    ],
  },
  {
    key: "PRJ_NACALC",
    name: "Nacalculatie boeken en verwerken",
    category: "ALG",
    description: "Test of projectkosten (uren, materiaal en overige kosten) correct als nacalculatie kunnen worden geboekt en verwerkt in AFAS Profit Projecten.",
    steps: [
      {
        title: "Nacalculatieregel voor uren aanmaken",
        instruction: "Ga naar Projecten > Nacalculatie > Nacalculatie boeken en klik op 'Nieuw'. Selecteer het project, de bewakingscode, het type projectkosten 'Uren', de werksoort en de urensoort. Vul datum en aantal uren in.",
        expectedResult: "De nacalculatieregel is aangemaakt met de juiste projectkoppeling. Profit berekent automatisch de kostprijs op basis van het uurtarief voor de werksoort en de medewerker.",
      },
      {
        title: "Nacalculatieregel voor materiaalkosten aanmaken",
        instruction: "Maak een nieuwe nacalculatieregel aan via Projecten > Nacalculatie > Nacalculatie boeken. Selecteer het type projectkosten 'Materiaal', kies de kostensoort (bijv. 'Reiskosten') en vul de hoeveelheid en kostprijs per eenheid in.",
        expectedResult: "De materiaalkosten worden als afzonderlijke nacalculatieregel opgeslagen. Profit toont het totale bedrag (hoeveelheid maal kostprijs) en de kostensoort is zichtbaar in het nacalculatieoverzicht.",
      },
      {
        title: "Nacalculatieoverzicht per project raadplegen",
        instruction: "Ga naar Projecten > Nacalculatie > Nacalculatieoverzicht en filter op het betreffende project en de gewenste periode. Controleer alle geboekte kostenregels inclusief type, bedrag en bewakingscode.",
        expectedResult: "Het nacalculatieoverzicht toont alle geboekte regels gesorteerd op type projectkosten (uren, materiaal, overig) met correcte bedragen, datums en bewakingscodes.",
      },
      {
        title: "Nacalculatie accorderen",
        instruction: "Ga als projectmanager naar Projecten > Nacalculatie > Accordering en selecteer de openstaande nacalculatieregels voor het project. Klik op 'Accorderen' om de regels definitief te maken.",
        expectedResult: "De geaccordeerde nacalculatieregels hebben de status 'Geaccordeerd' en zijn niet meer aanpasbaar zonder de accordering ongedaan te maken. Ze worden meegenomen in de projectresultaten en de factuurbasis.",
      },
      {
        title: "Projectresultaten na nacalculatie controleren",
        instruction: "Ga naar Projecten > Project > Projectresultaten en controleer of de geaccordeerde nacalculatieregels zijn verwerkt in de totalen voor 'Werkelijke kosten' en 'Restant budget'.",
        expectedResult: "De werkelijke kosten zijn bijgewerkt met de geaccordeerde nacalculatieregels. Het restant budget is dienovereenkomstig gedaald en de projectmarge (verkoopprijs minus kostprijs) is actueel weergegeven.",
      },
    ],
  },
  {
    key: "PRJ_RESOURCE",
    name: "Resourceplanning en capaciteitsbewaking",
    category: "ALG",
    description: "Test of medewerkers correct aan projecten en projectfases kunnen worden gepland en of de capaciteitsbezetting inzichtelijk is in AFAS Profit Projecten.",
    steps: [
      {
        title: "Geplande uren per medewerker invoeren",
        instruction: "Ga naar Projecten > Planning > Resourceplanning en selecteer het project. Voeg per medewerker en projectfase de geplande inzet (uren per week of totaal) in voor de projectperiode.",
        expectedResult: "De geplande uren zijn opgeslagen per medewerker, projectfase en periode. Het systeem toont de totale geplande inzet per medewerker en vergelijkt dit met de voorcalculatie-uren.",
      },
      {
        title: "Beschikbaarheid medewerker controleren",
        instruction: "Ga naar Projecten > Planning > Bezettingsoverzicht en selecteer een projectmedewerker. Controleer de ingeplande uren versus de beschikbare capaciteit op basis van het arbeidscontract en geregistreerde verlofuren.",
        expectedResult: "Het bezettingsoverzicht toont per week de geplande uren, de beschikbare uren en de resterende vrije capaciteit van de medewerker. Eventuele overschrijdingen van de beschikbaarheid worden gemarkeerd.",
      },
      {
        title: "Capaciteitsconflict signaleren",
        instruction: "Plan een medewerker in op meerdere gelijktijdige projecten zodat de totale geplande uren de beschikbare capaciteit overschrijden. Sla de planning op en controleer het bezettingsoverzicht.",
        expectedResult: "Profit signaleert de overbezetting in het bezettingsoverzicht door de betreffende periode te markeren met een waarschuwing. De planner kan planningsregels aanpassen om het conflict op te lossen.",
      },
      {
        title: "Werksoort en rol toewijzen aan planningsregel",
        instruction: "Ga naar de resourceplanning van het project en wijs aan een planningsregel een werksoort (bijv. 'Consultancy') en een projectrol (bijv. 'Senior Consultant') toe. Sla de planningsregel op.",
        expectedResult: "De planningsregel is opgeslagen met de gekoppelde werksoort en rol. De combinatie is consistent met de geldigheidscombinaties van het project en de geselecteerde medewerker.",
      },
      {
        title: "Geplande versus gerealiseerde uren vergelijken",
        instruction: "Open het planningoverzicht via Projecten > Planning > Geplande vs. Gerealiseerde uren. Filter op het project en de actieve projectfase en vergelijk de geplande uren met de geboekte nacalculatie-uren.",
        expectedResult: "Het overzicht toont per medewerker en projectfase de geplande uren naast de werkelijk geboekte nacalculatie-uren. Afwijkingen zijn direct zichtbaar als onderbesteding of overbesteding.",
      },
    ],
  },
  {
    key: "PRJ_FACTURATIE",
    name: "Projectfacturatie en termijnen",
    category: "ALG",
    description: "Test of projectfacturen correct worden gegenereerd via termijnen of factuurvoorstel en of de volledige facturatiecyclus in AFAS Profit Projecten correct verloopt.",
    steps: [
      {
        title: "Facturatiewijze op project instellen",
        instruction: "Open het project via Projecten > Project, ga naar het tabblad 'Facturatie' en stel de facturatiewijze in op 'Termijnfacturatie'. Vul de inningswijze en facturatiefrequentie in en sla de instellingen op.",
        expectedResult: "De facturatiewijze 'Termijnfacturatie' is opgeslagen op het project. Het tabblad 'Termijnen' is beschikbaar en de facturatiegegevens zijn consistent met de projectinstellingen.",
      },
      {
        title: "Betalingstermijnen aanmaken",
        instruction: "Ga naar Projecten > Project > tabblad 'Termijnen' en voeg betalingstermijnen toe. Stel per termijn een omschrijving, een percentage of vast bedrag en een factuurdatum of voortgangspercentage in.",
        expectedResult: "De termijnen zijn opgeslagen en zichtbaar in het termijntabblad. Het totaal van alle termijnen komt overeen met de projectsom en de termijnen zijn gereed voor het genereren van een factuurvoorstel.",
      },
      {
        title: "Factuurvoorstel aanmaken",
        instruction: "Ga naar Projecten > Facturatie > Factuurvoorstel en klik op 'Nieuw'. Selecteer het project, kies de relevante termijn of de te factureren nacalculatieperiode en klik op 'Voorstel genereren'.",
        expectedResult: "Het factuurvoorstel is gegenereerd met de juiste factuurbedragen, btw-codes en verwijzing naar het project en de termijn. Het voorstel heeft de status 'Concept' en kan worden beoordeeld.",
      },
      {
        title: "Factuurvoorstel accorderen en definitief maken",
        instruction: "Open het factuurvoorstel via Projecten > Facturatie > Factuurvoorstel, controleer de factuurregels op juistheid en klik op 'Definitief' om het voorstel om te zetten in een definitieve projectfactuur.",
        expectedResult: "De projectfactuur is aangemaakt in de debiteurenadministratie met een toegewezen factuurnummer. De factuurstatus is 'Definitief' en de factuur is gereed voor verzending naar de klant.",
      },
      {
        title: "Factuur verzenden en facturatiestatus controleren",
        instruction: "Selecteer de definitieve factuur via Projecten > Facturatie > Projectfactuur en klik op 'Verzenden'. Verstuur de factuur per e-mail via de ingestelde factuurlay-out en controleer daarna de facturatiestatus op het project.",
        expectedResult: "De factuur is verstuurd naar het factuuradres van de verkooprelatie. Op het project is het gefactureerde bedrag bijgewerkt, de termijn heeft de status 'Gefactureerd' en de projectmarge is actueel weergegeven.",
      },
    ],
  },
  {
    key: "PRJ_RAPPORTAGES",
    name: "Projectrapportages en dashboards",
    category: "ALG",
    description: "Test of projectrapportages en managementdashboards in AFAS Profit actuele en correcte inzichten bieden in voortgang, kosten, marge en prognose per project.",
    steps: [
      {
        title: "Projectresultatenrapport raadplegen",
        instruction: "Ga naar Projecten > Projectresultaten en open het standaardrapport 'Projectresultaten'. Filter op een actief project of projectgroep en selecteer de gewenste periode. Klik op 'Vernieuwen' om actuele gegevens te laden.",
        expectedResult: "Het rapport toont per project de voorcalculatie, nacalculatie, gefactureerd bedrag en marge. De cijfers komen overeen met de eerder ingevoerde voor- en nacalculatiegegevens.",
      },
      {
        title: "Projectendashboard openen en filteren",
        instruction: "Navigeer via Projecten > Dashboard > Projectendashboard. Stel filters in op projectgroep, projectmanager en periode. Bekijk de grafieken en KPI-tegels voor budgetbewaking en facturatievoortgang.",
        expectedResult: "Het dashboard laadt correct en toont actuele waarden voor gebudgetteerde uren, gerealiseerde uren, marge en facturatiepercentage per gefilterd project of projectgroep.",
      },
      {
        title: "Voorcalculatie vs. nacalculatie per projectfase exporteren",
        instruction: "Ga naar Projecten > Rapportages > Voor- vs. nacalculatie en selecteer het te analyseren project. Kies het detailniveau 'Per projectfase' en klik op 'Exporteren naar Excel'.",
        expectedResult: "Het Excel-bestand wordt gegenereerd met kolommen voor projectfase, bewakingscode, gebudgetteerde uren en kosten, werkelijke uren en kosten en het verschil (afwijking). Het bestand is foutloos te openen.",
      },
      {
        title: "Projectprognose-dashboard raadplegen",
        instruction: "Open het Projectprognose-dashboard via Projecten > Dashboard > Projectprognose. Controleer voor een actief project de verwachte eindkosten bij voltooiing en de verwachte marge op basis van de huidige voortgang.",
        expectedResult: "Het prognose-dashboard toont een actuele schatting van de eindkosten en marge. Op basis van de geboekte nacalculatie en resterende voorcalculatie is een realistische voortgangsprognose zichtbaar.",
      },
      {
        title: "Nacalculatieoverzicht per medewerker raadplegen",
        instruction: "Ga naar Projecten > Nacalculatie > Nacalculatieoverzicht en stel de groepering in op 'Per medewerker'. Filter op de lopende projecten en de actieve periode en bekijk de geboekte uren en kosten.",
        expectedResult: "Het overzicht toont per medewerker de geboekte uren en kosten uitgesplitst naar project en werksoort. De totalen per medewerker sluiten aan op de geaccordeerde nacalculatieregels in Profit.",
      },
      {
        title: "Managementrapportage projecten genereren",
        instruction: "Ga naar Rapportages > Managementrapportage > Projecten en kies de standaardrapportage 'Projectoverzicht marge'. Stel de gewenste filters (periode, projectgroep) in en klik op 'Rapport genereren'.",
        expectedResult: "De managementrapportage wordt gegenereerd als PDF of Excel met een overzicht van alle projecten inclusief omzet, kosten, marge en margepercentage. De gegevens sluiten aan op de projectadministratie in Profit.",
      },
    ],
  },
];
