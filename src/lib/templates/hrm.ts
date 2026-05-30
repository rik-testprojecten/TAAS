import type { WorkflowTemplate } from "./types";

export const HRM_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "HRM_DOSSIER",
    name: "Medewerkerdossier beheren",
    category: "HR",
    description: "Test het aanmaken en bijhouden van een volledig medewerkerdossier inclusief dienstverband, functiemutatie en persoonlijke gegevens in AFAS Profit.",
    steps: [
      {
        title: "Nieuwe medewerker toevoegen",
        instruction: "Ga naar HRM > Medewerker > Medewerker en klik op 'Nieuw'. Vul de verplichte velden in: achternaam, voornaam, BSN, geboortedatum, geslacht en indienstdatum. Koppel de juiste werkgever en organisatorische eenheid.",
        expectedResult: "De medewerker wordt aangemaakt met status 'In dienst' en een eerste dienstverband wordt automatisch gegenereerd."
      },
      {
        title: "Dienstverbandgegevens vastleggen",
        instruction: "Open het tabblad 'Dienstverband' van de zojuist aangemaakte medewerker en vul in: functie, parttime percentage, contractvorm (bepaalde of onbepaalde tijd), CAO en inschaling (schaal en trede).",
        expectedResult: "Het dienstverband toont de correcte functie, contractvorm en salarisschaal. Profit berekent automatisch het bijbehorende salaris op basis van de inschaling."
      },
      {
        title: "Adres- en contactgegevens invoeren",
        instruction: "Ga naar het tabblad 'Adres' van de medewerker en voer het woonadres, postcode, woonplaats en land in. Voeg ook het prive-e-mailadres en telefoonnummer toe op het tabblad 'Communicatie'.",
        expectedResult: "Adres- en contactgegevens worden opgeslagen en zijn zichtbaar in het medewerkerdossier. Het adres is beschikbaar voor loonberekening (reiskostenvergoeding)."
      },
      {
        title: "Document toevoegen aan dossier",
        instruction: "Open het tabblad 'Dossier' van de medewerker en klik op 'Nieuw'. Kies dossiertype 'Arbeidsovereenkomst', upload het ondertekende contract als PDF en stel de vervaldatum in indien van toepassing.",
        expectedResult: "Het document verschijnt als dossieritem met het juiste dossiertype en uploaddatum, en is te openen vanuit het medewerkerdossier."
      },
      {
        title: "Functiemutatie vastleggen",
        instruction: "Ga naar het tabblad 'Functie' van de medewerker en klik op 'Nieuwe functieregel'. Vul de nieuwe functie, organisatorische eenheid en ingangsdatum in. Geef het percentage van de nieuwe aanstelling op.",
        expectedResult: "De nieuwe functieregel is zichtbaar met de juiste ingangsdatum. De vorige functieregel krijgt automatisch een einddatum die aansluit op de nieuwe ingangsdatum."
      },
      {
        title: "Medewerker raadplegen via overzicht",
        instruction: "Ga naar HRM > Medewerker > Medewerkers (overzicht) en filter op de zojuist aangemaakte medewerker. Controleer de gegevens in het overzicht op volledigheid.",
        expectedResult: "De medewerker is zichtbaar in het overzicht met de correcte naam, functie, organisatorische eenheid en dienstverbandstatus."
      }
    ]
  },
  {
    key: "HRM_ATS",
    name: "Werving en selectie (ATS)",
    category: "HR",
    description: "Test het volledige wervings- en selectieproces in AFAS Profit, van het aanmaken van een vacature tot het aannemen van een geschikte kandidaat.",
    steps: [
      {
        title: "Vacature aanmaken",
        instruction: "Ga naar HRM > Werving en selectie > Vacatures en klik op 'Nieuw'. Vul in: vacaturenaam, organisatorische eenheid, functie, aantal fte, sluitingsdatum en publicatietype (intern, extern of beide). Sla de vacature op.",
        expectedResult: "De vacature wordt aangemaakt met status 'Concept' en is zichtbaar in het vacatureoverzicht."
      },
      {
        title: "Vacature publiceren op InSite of OutSite",
        instruction: "Open de vacature en klik op de actie 'Publiceren'. Controleer de vacaturetekst en kies de publicatiekanalen: InSite voor interne publicatie en/of de externe vacaturepagina via OutSite. Bevestig de publicatie.",
        expectedResult: "De vacaturestatus wijzigt naar 'Gepubliceerd' en de vacature is zichtbaar op de geconfigureerde InSite- of OutSite-pagina voor medewerkers en/of kandidaten."
      },
      {
        title: "Sollicitant registreren",
        instruction: "Ga in de vacature naar het tabblad 'Sollicitanten' en klik op 'Nieuw'. Vul de gegevens van de sollicitant in: naam, e-mailadres, telefoonnummer en motivatie. Upload het cv als bijlage. Sla de sollicitatie op.",
        expectedResult: "De sollicitant verschijnt in de sollicitantenlijst van de vacature met status 'Nieuwe sollicitatie'. De vacaturehouder ontvangt een workflow-taak in InSite om de sollicitant te beoordelen."
      },
      {
        title: "Sollicitant beoordelen en gesprek inplannen",
        instruction: "Open de sollicitant in de vacature en klik op 'Beoordelen sollicitant'. Ken sterren toe op basis van de beoordelingscriteria (competenties, motivatie, cv). Voeg een notitie toe en plan een sollicitatiegesprek in via de actie 'Gesprek plannen'.",
        expectedResult: "De beoordeling is opgeslagen in het dossier van de sollicitant. De status wijzigt naar 'Uitgenodigd voor gesprek' en een afspraakbevestiging wordt verstuurd."
      },
      {
        title: "Kandidaat aannemen en koppelen aan onboarding",
        instruction: "Open de geschikte kandidaat en klik op de actie 'Aannemen'. Koppel de kandidaat aan een bestaande of nieuwe medewerkerskaart. Stel de indienstdatum en functie in en koppel een onboardingprofiel om de onboardingworkflow te starten.",
        expectedResult: "De kandidaat krijgt status 'Aangenomen'. Een medewerkerskaart wordt aangemaakt of bijgewerkt, en de onboardingworkflow start automatisch in InSite."
      }
    ]
  },
  {
    key: "HRM_ONBOARDING",
    name: "Onboarding en offboarding",
    category: "HR",
    description: "Test het geautomatiseerde onboarding- en offboardingproces voor nieuwe en vertrekkende medewerkers via AFAS Profit-workflows en InSite-takenlijsten.",
    steps: [
      {
        title: "Onboardingprofiel koppelen aan nieuwe medewerker",
        instruction: "Ga naar HRM > Medewerker > Medewerker, open de nieuwe medewerker en navigeer naar het tabblad 'Onboarding'. Koppel het juiste onboardingprofiel op basis van de functie. Sla op en controleer of de onboardingtaken zijn aangemaakt.",
        expectedResult: "Het onboardingprofiel wordt gekoppeld en de bijbehorende taken en checklists zijn automatisch aangemaakt in het workflow-dossier van de medewerker."
      },
      {
        title: "Onboardingtaken verwerken in InSite",
        instruction: "Log in op InSite als de nieuwe medewerker. Ga naar het onderdeel 'Onboarden' of de tegel 'Mijn taken'. Voltooi de onboardingstaken: upload een ID-bewijs, vul bankgegevens in en bevestig de gedragscode.",
        expectedResult: "De voltooide taken krijgen de status 'Afgerond' in het onboardingdossier. De HR-medewerker ontvangt een melding dat de taken zijn voltooid."
      },
      {
        title: "HR-taken onboarding afhandelen in Profit",
        instruction: "Ga in Profit naar het taakoverzicht en open de openstaande onboardingtaken voor de nieuwe medewerker. Verwerk de HR-taken: controleer de looninrichting en bevestig de aanmaak van toegangsrechten en benodigde bedrijfsmiddelen.",
        expectedResult: "Alle HR-taken zijn gemarkeerd als afgerond. Het onboardingdossier toont een volledigheidspercentage van 100% en de medewerker is volledig operationeel geregistreerd."
      },
      {
        title: "Uitdienstmelding vastleggen",
        instruction: "Ga naar HRM > Medewerker > Medewerker, open de vertrekkende medewerker en klik op 'Uitdienst melden'. Vul de uitdienstdatum en de reden van vertrek in. Koppel een offboardingprofiel om de offboardingworkflow te starten.",
        expectedResult: "Het dienstverband krijgt een einddatum en de status wijzigt naar 'Uitdienst'. Offboardingtaken worden aangemaakt voor HR, ICT en de leidinggevende."
      },
      {
        title: "Offboardingtaken afhandelen en eindafrekening controleren",
        instruction: "Verwerk de openstaande offboardingtaken in Profit: bevestig inlevering van bedrijfsmiddelen, zet toegangsrechten uit en controleer de eindafrekening in Payroll (vakantiegeld, resterende verlofuren, eindloon).",
        expectedResult: "Alle offboardingtaken zijn afgerond. De eindafrekening is correct berekend en de medewerker ontvangt geen verdere salarisbetalingen na de uitdienstdatum."
      }
    ]
  },
  {
    key: "HRM_VERLOF",
    name: "Verlof- en verzuimregistratie",
    category: "HR",
    description: "Test het aanvragen, goedkeuren en registreren van verlof en verzuim via InSite en AFAS Profit, inclusief de saldocontrole en workflow-afhandeling.",
    steps: [
      {
        title: "Verlofaanvraag indienen via InSite",
        instruction: "Log in op InSite als medewerker. Ga naar de tegel 'Verlof' en klik op 'Aanvragen'. Selecteer het verlofsoort (bijv. vakantieverlof), kies de begin- en einddatum en voeg een toelichting toe. Dien de aanvraag in.",
        expectedResult: "De verlofaanvraag is ingediend met status 'In behandeling'. De leidinggevende ontvangt automatisch een goedkeurstaak in zijn of haar InSite-inbox."
      },
      {
        title: "Verlofaanvraag goedkeuren als leidinggevende",
        instruction: "Log in op InSite als leidinggevende. Open de taak 'Verlofaanvraag beoordelen' in de inbox. Controleer het verlofoverzicht van de medewerker en de teamplanning. Klik op 'Goedkeuren' en voeg een opmerking toe indien gewenst.",
        expectedResult: "De verlofaanvraag krijgt status 'Goedgekeurd'. Het verlof wordt automatisch geboekt en het verlofsaldo van de medewerker wordt bijgewerkt in Profit."
      },
      {
        title: "Verlofsaldo controleren in Profit",
        instruction: "Ga in Profit naar HRM > Verlof > Verlofoverzicht. Zoek de medewerker op en controleer het actuele verlofsaldo: het opgebouwde saldo, het opgenomen verlof en het resterende saldo per verlofsoort.",
        expectedResult: "Het verlofsaldo is correct bijgewerkt: het opgenomen verlof is afgetrokken van het beschikbare saldo en de verlofperiode is zichtbaar in de verlofregistratie."
      },
      {
        title: "Ziekmelding registreren",
        instruction: "Ga in Profit naar HRM > Verzuim > Verzuim en klik op 'Nieuw'. Selecteer de medewerker, vul de eerste ziektedag in en kies de verzuimreden indien bekend. Sla de ziekmelding op.",
        expectedResult: "De ziekmelding is aangemaakt met status 'Ziek'. Het verzuimdossier wordt aangemaakt en de leidinggevende ontvangt een melding van de ziekmelding."
      },
      {
        title: "Herstelmelding verwerken",
        instruction: "Ga naar het open verzuimdossier van de medewerker via HRM > Verzuim > Verzuim. Open de ziekmelding en klik op 'Hersteld melden'. Vul de datum van herstel in en sla op.",
        expectedResult: "De verzuimregistratie wordt afgesloten met de herstelmelddatum. Het verzuimpercentage en de verzuimduur worden automatisch berekend in de rapportage."
      }
    ]
  },
  {
    key: "HRM_DECLARATIES",
    name: "Declaraties indienen en goedkeuren",
    category: "HR",
    description: "Test het indienen, beoordelen en verwerken van medewerkerdeclaraties via InSite en AFAS Profit, inclusief workflow-goedkeuring en verwerking in de salarisrun.",
    steps: [
      {
        title: "Declaratie indienen via InSite",
        instruction: "Log in op InSite als medewerker. Ga naar de tegel 'Declaraties' en klik op 'Nieuwe declaratie'. Selecteer het declaratietype (bijv. reiskosten of representatiekosten), vul het bedrag, de omschrijving en de kostendatum in. Upload een bonnetje als bijlage en dien de declaratie in.",
        expectedResult: "De declaratie is ingediend met status 'Ingediend' en de leidinggevende of kostenplaatsbeheerder ontvangt een goedkeurstaak in InSite."
      },
      {
        title: "Declaratie beoordelen als leidinggevende",
        instruction: "Log in op InSite als leidinggevende. Open de goedkeurstaak 'Declaratie beoordelen' in de inbox. Controleer de declaratieregels, het bonnetje en de kostenplaats. Klik op 'Goedkeuren' of 'Afwijzen' met een toelichting.",
        expectedResult: "Bij goedkeuring wijzigt de declaratiestatus naar 'Goedgekeurd' en wordt de declaratie doorgestuurd naar Payroll voor verwerking. Bij afwijzing ontvangt de medewerker een melding met de reden."
      },
      {
        title: "Goedgekeurde declaratie controleren in Profit",
        instruction: "Ga in Profit naar HRM > Declaraties > Declaratieoverzicht. Open de goedgekeurde declaratie en controleer de declaratieregels, de toegewezen kostenplaats en of de werkkostenregeling (WKR) correct is toegepast op de betreffende declaratietypen.",
        expectedResult: "De declaratie toont status 'Goedgekeurd' met de juiste kostenplaatskoppeling. WKR-declaratietypen zijn correct gelabeld als eindheffingsloon of vrije ruimte."
      },
      {
        title: "Declaratie verwerken in salarisrun",
        instruction: "Ga naar HRM > Payroll > Salarisverwerkingscockpit. Zorg dat de declaratie is opgenomen in de lopende salarisperiode en verwerk de periode via de actie 'Verwerken'. Controleer na een proefberekening of het declaratiebedrag als looncomponent zichtbaar is op de loonstrook.",
        expectedResult: "De declaratie is verwerkt als looncomponent in de salarisperiode. Op de proefrun-loonstrook is het declaratiebedrag correct opgenomen als nettovergoeding."
      }
    ]
  },
  {
    key: "HRM_FORMATIE",
    name: "Formatie en organisatie (organigram)",
    category: "HR",
    description: "Test het inrichten en beheren van de organisatiestructuur, formatieplaatsen en bezettingsoverzichten in het AFAS Profit organigram.",
    steps: [
      {
        title: "Organisatorische eenheid aanmaken",
        instruction: "Ga naar HRM > Organisatie > Organigram en klik op 'Nieuwe organisatorische eenheid'. Vul in: naam, afkortingscode, bovenliggende organisatorische eenheid en ingangsdatum. Sla op en controleer de positie in het organigram.",
        expectedResult: "De nieuwe organisatorische eenheid verschijnt op de juiste plek in het organigram onder de geselecteerde bovenliggende eenheid."
      },
      {
        title: "Functie koppelen aan organisatorische eenheid",
        instruction: "Open de organisatorische eenheid in het organigram en ga naar het tabblad 'Functies'. Klik op 'Nieuw' en koppel de gewenste functie aan de eenheid. Vul het aantal formatieplaatsen in FTE in en de ingangsdatum.",
        expectedResult: "De functie is gekoppeld aan de organisatorische eenheid met het opgegeven aantal formatieplaatsen. De formatiebegroting is bijgewerkt in het formatieoverzicht."
      },
      {
        title: "Formatiebegroting controleren",
        instruction: "Ga naar HRM > Formatie > Formatiebeheer. Selecteer de werkgever en het gewenste tijdvak. Bekijk het overzicht van begrote FTE per organisatorische eenheid en vergelijk dit met de feitelijke bezetting (gerealiseerde FTE).",
        expectedResult: "Het formatieoverzicht toont voor elke organisatorische eenheid de begrote FTE, de gerealiseerde FTE en het verschil (over- of onderbezetting)."
      },
      {
        title: "Medewerker koppelen aan formatieplaats",
        instruction: "Open een medewerker via HRM > Medewerker > Medewerker en ga naar het tabblad 'Functie'. Open de actieve functieregel en koppel een specifieke formatieplaats. Sla op en verifieer de koppeling.",
        expectedResult: "De medewerker telt mee in de realisatie van de gekoppelde formatieplaats. In het organigram is de medewerker zichtbaar onder de juiste organisatorische eenheid."
      },
      {
        title: "Organigram raadplegen en exporteren",
        instruction: "Ga naar HRM > Organisatie > Organigram en klik op de weergave 'Organigram'. Navigeer door de structuur en controleer de aangemaakte organisatorische eenheid en de bijbehorende medewerkers. Exporteer het organigram via de actie 'Afdrukken' of 'Exporteren'.",
        expectedResult: "Het organigram toont de volledige organisatiestructuur met de juiste eenheden en gekoppelde medewerkers. De export bevat een actueel overzicht van de organisatiestructuur."
      }
    ]
  },
  {
    key: "HRM_SALARIS",
    name: "Salarisverwerking (loonrun)",
    category: "HR",
    description: "Test het verwerken van een salarisperiode in AFAS Profit Payroll, van het controleren van mutaties tot het genereren van loonstroken en de betaalbestanden.",
    steps: [
      {
        title: "Salarismutaties controleren voor verwerking",
        instruction: "Ga naar HRM > Payroll > Salarisverwerkingscockpit en open het overzicht 'Mutaties'. Controleer alle openstaande mutaties voor de huidige periode: nieuwe dienstverbanden, salarisverhogingen, verlofopbouw en declaraties. Los eventuele blokkeringen op.",
        expectedResult: "Alle mutaties zijn verwerkt of goedgekeurd. Er zijn geen blokkeringen meer aanwezig die de salarisverwerking verhinderen."
      },
      {
        title: "Periodieken toekennen",
        instruction: "Ga in het Salarisverwerkingscockpit naar de actie 'Periodieken toekennen' voor de huidige salarisperiode. Start de taak en wacht tot de verwerking is afgerond. Controleer de log op eventuele fouten of waarschuwingen.",
        expectedResult: "Alle periodieken (vaste looncomponenten) zijn correct toegewezen aan de medewerkers voor de huidige periode. De log toont geen fouten."
      },
      {
        title: "Proefrun uitvoeren en controleren",
        instruction: "Selecteer in het Salarisverwerkingscockpit de werkgever en periode. Klik op 'Verwerken' en kies voor een proefberekening (simulatie). Bekijk de proefrun-loonstroken via de actie 'Output' en controleer steekproefsgewijs de berekeningen van meerdere medewerkers.",
        expectedResult: "De proefrun-loonstroken zijn gegenereerd. Brutoloon, inhoudingen, nettoloon en looncomponenten kloppen op basis van de looninrichting en actuele mutaties."
      },
      {
        title: "Definitieve salarisverwerking uitvoeren",
        instruction: "Nadat de proefrun is goedgekeurd, klik in het Salarisverwerkingscockpit op 'Definitief verwerken'. Bevestig de verwerking voor de geselecteerde werkgever en periode en wacht tot de verwerkingstaak is afgerond.",
        expectedResult: "De periode heeft status 'Definitief verwerkt'. Loonstroken en de loonjournaalpost zijn aangemaakt en het betaalbestand is gereed voor verzending aan de bank."
      },
      {
        title: "Loonstroken genereren en digitaal distribueren",
        instruction: "Ga naar HRM > Payroll > Loonstroken en selecteer de verwerkingsperiode. Klik op 'Loonstroken genereren'. Kies voor digitale beschikbaarstelling via InSite zodat medewerkers de loonstrook kunnen inzien via hun selfserviceportaal.",
        expectedResult: "Loonstroken zijn aangemaakt en digitaal beschikbaar gesteld in InSite. Medewerkers ontvangen een notificatie dat hun loonstrook klaarstaat."
      },
      {
        title: "Betaalbestand aanmaken en controleren",
        instruction: "Ga naar HRM > Payroll > Betaalbestand. Selecteer de periode en werkgever en klik op 'Betaalbestand aanmaken'. Controleer het overzicht op totaalbedrag, aantal betalingen en valutadatum. Exporteer het bestand in SEPA-formaat.",
        expectedResult: "Het betaalbestand is aangemaakt in SEPA-formaat met het correcte totaalbedrag. Het bestand is gereed om te worden ingeladen bij de bank voor uitbetaling van de salarissen."
      }
    ]
  },
  {
    key: "HRM_CAO",
    name: "CAO en looninrichting",
    category: "HR",
    description: "Test het controleren en instellen van de CAO-parameters, looncomponenten en werkkostenregeling (WKR) in AFAS Profit Payroll.",
    steps: [
      {
        title: "CAO raadplegen en controleren",
        instruction: "Ga naar HRM > Payroll > Inrichting > CAO. Open de actieve CAO van de werkgever en controleer op het tabblad 'Algemeen' de CAO-gegevens: naam, versienummer, geldigheidsdatum en de gekoppelde loonschalen.",
        expectedResult: "De CAO-eigenschappen zijn correct ingesteld met een geldige versiedatum. De CAO is gekoppeld aan de juiste werkgever en bevat de actuele loonschalen."
      },
      {
        title: "Loonschalen en treden controleren",
        instruction: "Ga in de CAO naar het tabblad 'Loonschalen'. Open een loonschaal en controleer de periodieken (treden) inclusief de bijbehorende bruto maandsalarissen. Vergelijk een trede met het dienstverbandscherm van een medewerker in die schaal.",
        expectedResult: "De loonschalen bevatten de actuele salarisbedragen conform de CAO-afspraken. Het bruto maandsalaris van de medewerker in de geselecteerde schaal en trede klopt met de CAO-tabel."
      },
      {
        title: "Looncomponent controleren op werking en fiscale behandeling",
        instruction: "Ga naar HRM > Payroll > Inrichting > Looncomponenten. Zoek een specifiek looncomponent (bijv. reiskostenvergoeding of onregelmatigheidstoeslag) en open de eigenschappen. Controleer het tabblad 'Toelichting' op de berekening en het tabblad 'Algemeen' op de fiscale behandeling.",
        expectedResult: "Het looncomponent heeft de correcte fiscale behandeling (belast, onbelast of eindheffing) en de berekeningsformule is conform de CAO- en wetgevingsvereisten ingesteld."
      },
      {
        title: "Werkkostenregeling (WKR) controle uitvoeren",
        instruction: "Ga naar HRM > Payroll > Werkkostenregeling. Selecteer het actuele fiscale jaar en de werkgever. Bekijk het overzicht van de vrije ruimte: het totaal toegestane WKR-budget, de gebruikte ruimte en de eventuele overschrijding.",
        expectedResult: "Het WKR-overzicht toont het correcte vrije-ruimtepercentage over het totale fiscale loon. Vergoedingen in de vrije ruimte zijn correct gecategoriseerd en een eventuele overschrijding is zichtbaar als eindheffingsbedrag."
      },
      {
        title: "Salarisverhoging doorvoeren via CAO-update",
        instruction: "Ga naar HRM > Payroll > Inrichting > CAO en open de actieve CAO. Voer een structurele salarisverhoging door op de loonschalen via de actie 'Loonschalen aanpassen'. Voer het verhogingspercentage in, stel de ingangsdatum in en voer daarna een proefberekening uit voor een steekproef aan medewerkers.",
        expectedResult: "De loonschalen zijn bijgewerkt met het nieuwe percentage. De proefberekening toont voor de steekproef-medewerkers het verhoogde bruto salaris met ingang van de opgegeven datum."
      }
    ]
  },
  {
    key: "HRM_PERFORMANCE",
    name: "Performance en talentmanagement",
    category: "HR",
    description: "Test de gesprekkencyclus, beoordelingsworkflow en talentmanagementfuncties in AFAS Profit, inclusief het vastleggen van doelen, competenties en beoordelingen via InSite.",
    steps: [
      {
        title: "Gesprekkencyclus starten voor medewerker",
        instruction: "Ga naar HRM > Talentmanagement > Gesprekkencyclus en klik op 'Nieuwe cyclus aanmaken'. Selecteer de medewerker, het gesprekstype (bijv. 'Planningsgesprek') en de cyclusperiode. Koppel de leidinggevende als gesprekspartner en sla op.",
        expectedResult: "De gesprekkencyclus is aangemaakt voor de medewerker met de juiste gesprekspartner en cyclusperiode. De medewerker en leidinggevende ontvangen een taak in InSite om het gesprek voor te bereiden."
      },
      {
        title: "Doelen vastleggen via InSite",
        instruction: "Log in op InSite als medewerker. Ga naar de tegel 'Mijn ontwikkeling' of 'Gesprekkencyclus'. Open het lopende planningsgesprek en voeg minimaal twee doelen toe met een omschrijving, meetcriterium en streefdatum. Sla de doelen op.",
        expectedResult: "De doelen zijn opgeslagen in het gesprekkendossier van de medewerker en zijn zichtbaar voor de leidinggevende in InSite. De status van het gesprek is bijgewerkt naar 'Voorbereiding medewerker compleet'."
      },
      {
        title: "Competenties beoordelen in gespreksvorm",
        instruction: "Log in op InSite als leidinggevende. Open het voortgangs- of beoordelingsgesprek van de medewerker. Beoordeel de gekoppelde competenties door een score toe te kennen (bijv. op een schaal van 1 tot 5) en voeg per competentie een toelichting toe.",
        expectedResult: "De competentiebeoordelingen zijn vastgelegd in het gespreksformulier. De totaalscore en kleurcodering (rood, oranje of groen) worden zichtbaar in het overzicht."
      },
      {
        title: "360-graden feedback uitvragen",
        instruction: "Open het beoordelingsgesprek van de medewerker in Profit via HRM > Talentmanagement > Gesprekkencyclus. Klik op 'Feedbackronde starten'. Selecteer de collega's die feedback moeten geven en verstuur het feedbackverzoek via de workflow.",
        expectedResult: "De geselecteerde collega's ontvangen een feedbacktaak in InSite. Na invulling is de feedback zichtbaar in het beoordelingsdossier en kan de leidinggevende deze betrekken bij de eindbeoordeling."
      },
      {
        title: "Eindoordeel vastleggen en gesprek afronden",
        instruction: "Open het beoordelingsgesprek als leidinggevende in InSite. Vul het eindoordeel in op het tabblad 'Beoordeling' (bijv. 'Voldoet aan verwachtingen' of 'Overtreft verwachtingen'). Voeg een eindtoelichting toe, klik op 'Gesprek afronden' en laat de medewerker digitaal accorderen via InSite.",
        expectedResult: "Het gesprek krijgt status 'Afgerond' en de beoordeling is opgeslagen in het medewerkerdossier. De digitale accordering van medewerker en leidinggevende is vastgelegd en het gespreksverslag is zichtbaar in het dossier."
      },
      {
        title: "Talentanalyse uitvoeren via HR3P-matrix",
        instruction: "Ga in Profit naar HRM > Talentmanagement > Talentanalyse. Selecteer de organisatorische eenheid en de beoordelingsperiode. Open de HR3P- of 9-GRID-matrix en controleer de positionering van de medewerkers op basis van de afgesloten beoordelingsgesprekken.",
        expectedResult: "De talentmatrix toont de medewerkers van de geselecteerde eenheid gepositioneerd op basis van prestaties en potentieel. De indeling klopt met de afgesloten beoordelingsgesprekken."
      }
    ]
  }
];
