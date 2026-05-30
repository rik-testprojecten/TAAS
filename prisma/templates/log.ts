import type { WorkflowTemplate } from "./types";

export const LOG_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "LOG_INKOOP",
    name: "Inkooporder tot factuur (P2P)",
    category: "INKOOP",
    description: "Test het volledige purchase-to-pay-proces: van het aanmaken van een inkooporder via ontvangst van goederen tot de 3-weg-confrontatie met de inkoopfactuur.",
    steps: [
      {
        title: "Inkooporder aanmaken",
        instruction: "Ga naar Ordermanagement > Inkoop > Inkooporder > Nieuw, selecteer een leverancier, voeg een artikelregel toe met het gewenste artikel en aantal, en sla de order op.",
        expectedResult: "De inkooporder is aangemaakt met status 'Open' en een uniek inkoopordernummer, inclusief de opgegeven artikelregel met prijs en aantal."
      },
      {
        title: "Inkooporder bevestigen",
        instruction: "Open de zojuist aangemaakte inkooporder en klik op Acties > Orderbevestiging afdrukken/verzenden om de order naar de leverancier te sturen.",
        expectedResult: "De orderbevestiging is gegenereerd en de orderstatus is bijgewerkt naar 'Bevestigd'."
      },
      {
        title: "Ontvangst registreren",
        instruction: "Ga naar Ordermanagement > Inkoop > Ontvangst > Nieuw, koppel de inkooporder, controleer het ontvangen aantal per artikelregel en sla de ontvangst op.",
        expectedResult: "De ontvangst is vastgelegd met het correcte aantal; de voorraad van het artikel is met het ontvangen aantal verhoogd en de ontvangststatus op de inkooporder is bijgewerkt."
      },
      {
        title: "Inkoopfactuur boeken",
        instruction: "Ga naar Financieel > Crediteuren > Inkoopfactuur > Nieuw, vul het factuurnummer van de leverancier, de leverancier en het factuurbedrag in, en sla de factuur op als geboekte crediteurfactuur.",
        expectedResult: "De inkoopfactuur is geboekt en zichtbaar in het crediteuropenstaand met het juiste bedrag en de juiste leverancier."
      },
      {
        title: "3-weg-confrontatie uitvoeren",
        instruction: "Ga naar Ordermanagement > Inkoop > Confrontatie, klik op Nieuw, zoek de geboekte inkoopfactuur op via het zoekveld Factuurnummer, selecteer de bijbehorende ontvangstregel en klik op Opslaan en sluiten.",
        expectedResult: "De inkoopfactuur is gekoppeld aan de ontvangst; hoeveelheid en bedrag komen overeen (geen verschil) en de confrontatiestatus is 'Geconfronteerd'."
      },
      {
        title: "Betaalbaarstelling controleren",
        instruction: "Open de geconfronteerde inkoopfactuur in Financieel > Crediteuren > Inkoopfactuur en controleer of de betaalstatus is bijgewerkt naar 'Te betalen'.",
        expectedResult: "De factuur heeft de betaalstatus 'Te betalen' en is opgenomen in het betalingsvoorstel, zodat tijdige betaling aan de leverancier mogelijk is."
      }
    ]
  },
  {
    key: "LOG_VERKOOP",
    name: "Verkooporder tot factuur",
    category: "ALG",
    description: "Test het verkoopproces van het aanmaken van een verkooporder tot en met het genereren en journaliseren van de verkoopfactuur.",
    steps: [
      {
        title: "Verkooporder aanmaken",
        instruction: "Ga naar Ordermanagement > Verkoop > Verkooporder > Nieuw, selecteer de debiteur, voeg een of meerdere artikelregels toe met artikel, aantal en prijs, en sla de order op.",
        expectedResult: "De verkooporder is aangemaakt met een uniek ordernummer, status 'Open', en de ingevoerde artikelregels zijn zichtbaar inclusief berekende regeltotalen."
      },
      {
        title: "Orderbevestiging versturen",
        instruction: "Open de verkooporder en klik op Acties > Orderbevestiging afdrukken/verzenden om de bevestiging naar de klant te sturen.",
        expectedResult: "De orderbevestiging is aangemaakt en verstuurd; de orderstatus is bijgewerkt naar 'Bevestigd'."
      },
      {
        title: "Pakbon aanmaken",
        instruction: "Open de verkooporder en klik op Acties > Pakbon aanmaken, controleer het te leveren aantal per artikelregel en sla de pakbon op.",
        expectedResult: "De pakbon is aangemaakt met de bijbehorende verkooporderregels, het te leveren aantal is correct en de status van de pakbon is 'Open'."
      },
      {
        title: "Pakbon gereedmelden",
        instruction: "Ga naar Ordermanagement > Verkoop > Pakbon, open de pakbon en klik op Acties > Pakbon gereedmelden om de verzending te registreren.",
        expectedResult: "De pakbonstatus is gewijzigd naar 'Gereed'; de voorraad is afgeboekt met het geleverde aantal en de verkooporderregels zijn als geleverd gemarkeerd."
      },
      {
        title: "Verkoopfactuur genereren",
        instruction: "Ga naar Ordermanagement > Verkoop > Verkoopfactuur genereren, selecteer de gereedgemelde pakbon(nen) en klik op Genereren.",
        expectedResult: "De verkoopfactuur is aangemaakt met het juiste factuurbedrag, de juiste debiteur en de bijbehorende orderreferentie."
      },
      {
        title: "Factuur journaliseren",
        instruction: "Open de gegenereerde verkoopfactuur in Ordermanagement > Verkoop > Verkoopfactuur en klik op Acties > Journaliseren om de factuur naar Financieel door te boeken.",
        expectedResult: "De verkoopfactuur is gejournaliseerd en zichtbaar als openstaande debiteurenpost in Financieel > Debiteuren > Openstaande posten."
      }
    ]
  },
  {
    key: "LOG_ORDERS",
    name: "Orderbeheer en orderopvolging",
    category: "ALG",
    description: "Test het beheren en opvolgen van verkoop- en inkooporders, inclusief statusbewaking, orderwijzigingen en het verwerken van een bestelvoorstel.",
    steps: [
      {
        title: "Bestelvoorstel genereren",
        instruction: "Ga naar Ordermanagement > Inkoop > Bestelvoorstel > Genereren, selecteer het magazijn en de artikelgroep, en klik op Genereren om voorstellen op basis van minimumvoorraden aan te maken.",
        expectedResult: "Het bestelvoorstel is gegenereerd met artikelen waarvan de voorraad onder het ingestelde bestelniveau valt, inclusief het voorgestelde bestelsaantal per leverancier."
      },
      {
        title: "Bestelvoorstel omzetten naar inkooporder",
        instruction: "Open het gegenereerde bestelvoorstel in Ordermanagement > Inkoop > Bestelvoorstel, selecteer de gewenste regels en klik op Acties > Omzetten naar inkooporder.",
        expectedResult: "De geselecteerde bestelvoorstelregels zijn omgezet naar een of meerdere inkooporders per leverancier, zichtbaar in Ordermanagement > Inkoop > Inkooporder."
      },
      {
        title: "Verkooporder wijzigen",
        instruction: "Open een bestaande verkooporder in Ordermanagement > Verkoop > Verkooporder, pas het aantal van een artikelregel aan en sla de wijziging op.",
        expectedResult: "De verkooporder toont het bijgewerkte aantal en het herberekende orderbedrag; de wijziging is zichtbaar in de orderhistorie."
      },
      {
        title: "Openstaande orders bewaken",
        instruction: "Ga naar Ordermanagement > Verkoop > Verkooporder en filter op orderstatus 'Open' om alle openstaande orders te bekijken.",
        expectedResult: "Het overzicht toont uitsluitend orders met de status 'Open', inclusief ordernummer, debiteur, orderdatum en openstaand bedrag."
      },
      {
        title: "Verkooporder annuleren",
        instruction: "Open een verkooporder zonder gekoppelde pakbon in Ordermanagement > Verkoop > Verkooporder en klik op Acties > Annuleren.",
        expectedResult: "De verkooporder heeft de status 'Geannuleerd' gekregen; er zijn geen voorraadmutaties of factuurregels aangemaakt."
      }
    ]
  },
  {
    key: "LOG_VOORRAAD",
    name: "Voorraadbeheer en voorraadmutaties",
    category: "ALG",
    description: "Test het bijhouden en muteren van de artikelvoorraad, inclusief voorraadcorrecties, voorraadtelling en inzicht via het voorraadoverzicht.",
    steps: [
      {
        title: "Artikel controleren op voorraadprofiel",
        instruction: "Ga naar Ordermanagement > Artikelen > Artikel, open een artikel en controleer op het tabblad Voorraad of het voorraadprofiel, bestelniveau en bestelhoeveelheid correct zijn ingesteld.",
        expectedResult: "Het artikel toont het juiste voorraadprofiel met ingestelde minimum- en maximumvoorraad; het bestelniveau is conform de afgesproken parameterwaarden."
      },
      {
        title: "Actuele voorraad raadplegen",
        instruction: "Ga naar Ordermanagement > Voorraad > Actuele voorraad, filter op het gewenste artikel of de gewenste artikelgroep en bekijk de vrije voorraad per magazijn en locatie.",
        expectedResult: "Het overzicht toont de actuele vrije voorraad per artikel uitgesplitst per magazijn en locatie, inclusief gereserveerde en bestelde aantallen."
      },
      {
        title: "Handmatige voorraadmutatie invoeren",
        instruction: "Ga naar Ordermanagement > Voorraad > Voorraadmutatie > Nieuw, selecteer het artikel, het magazijn en de locatie, voer het mutatieaantal en het mutatietype (bijv. correctie) in en sla op.",
        expectedResult: "De voorraadmutatie is verwerkt; de actuele voorraad van het artikel is met het opgegeven aantal bijgesteld en de mutatie is zichtbaar in de mutatiehistorie."
      },
      {
        title: "Tellijst genereren voor voorraadtelling",
        instruction: "Ga naar Ordermanagement > Voorraad > Voorraadtelling > Nieuw, selecteer het magazijn, genereer de tellijst voor de gewenste artikelen en druk de tellijst af.",
        expectedResult: "De tellijst is aangemaakt met de verwachte voorraadaantallen per artikel en locatie; de lijst is gereed om de fysieke telling mee uit te voeren."
      },
      {
        title: "Voorraadtelling verwerken",
        instruction: "Open de voltooide voorraadtelling in Ordermanagement > Voorraad > Voorraadtelling, voer de getelde aantallen in per artikelregel en klik op Acties > Verwerken.",
        expectedResult: "De tellingsverschillen zijn als voorraadmutaties geboekt; de actuele voorraad sluit aan op de getelde aantallen en de telling heeft de status 'Verwerkt'."
      }
    ]
  },
  {
    key: "LOG_MAGAZIJN",
    name: "Magazijnbeheer en picken (WMS)",
    category: "ALG",
    description: "Test het magazijnbeheerproces inclusief locatiebeheer, het aanmaken van een picklijst vanuit een pakbon en het verwerken van een magazijnverplaatsing.",
    steps: [
      {
        title: "Magazijn en locaties controleren",
        instruction: "Ga naar Ordermanagement > Inrichting > Magazijn, open het gewenste magazijn en controleer de geconfigureerde locaties (bijv. stellingvak A1-01) op code, type en capaciteitsinstellingen.",
        expectedResult: "Het magazijn toont alle ingerichte locaties met correcte locatiecodes; elke locatie heeft het juiste type en de juiste capaciteitsinstellingen."
      },
      {
        title: "Picklijst aanmaken vanuit pakbon",
        instruction: "Ga naar Ordermanagement > Verkoop > Pakbon, open een pakbon met status 'Open' en klik op Acties > Picklijst aanmaken om een picklijst gesorteerd op locatievolgorde te genereren.",
        expectedResult: "De picklijst is aangemaakt met alle te picken artikelen gesorteerd op magazijnlocatie, inclusief artikelcode, omschrijving, te picken aantal en locatieaanduiding."
      },
      {
        title: "Picken registreren",
        instruction: "Open de picklijst in Ordermanagement > Verkoop > Picklijst, registreer per regel het werkelijk gepickte aantal en bevestig de pickactie per artikelregel.",
        expectedResult: "De gepickte aantallen zijn vastgelegd; artikelregels die volledig zijn gepickt hebben de status 'Gepickt' en de gekoppelde pakbon is bijgewerkt."
      },
      {
        title: "Magazijnverplaatsing uitvoeren",
        instruction: "Ga naar Ordermanagement > Voorraad > Magazijnverplaatsing > Nieuw, selecteer het artikel, de bronlocatie, de doellocatie en het te verplaatsen aantal, en sla de verplaatsing op.",
        expectedResult: "De voorraad op de bronlocatie is met het opgegeven aantal verlaagd en op de doellocatie met hetzelfde aantal verhoogd; de verplaatsing is gelogd in de mutatiehistorie."
      },
      {
        title: "Pakbon gereedmelden na picken",
        instruction: "Open de pakbon in Ordermanagement > Verkoop > Pakbon en klik op Acties > Pakbon gereedmelden nadat alle picklijstregels zijn bevestigd.",
        expectedResult: "De pakbonstatus is gewijzigd naar 'Gereed'; de voorraad is definitief afgeboekt van de picklocatie en de pakbon staat klaar voor facturatie."
      }
    ]
  },
  {
    key: "LOG_PRODUCTIE",
    name: "Productie en assemblage (beperkt)",
    category: "ALG",
    description: "Test het beperkte productie- en assemblageproces: van het controleren van de stuklijst via het aanmaken van een productieorder tot het verwerken van de productiebon.",
    steps: [
      {
        title: "Samengesteld artikel en stuklijst controleren",
        instruction: "Ga naar Ordermanagement > Artikelen > Artikel, open het samengestelde artikel en klik op het tabblad Samenstelling om de stuklijst (componentartikelen met aantallen) te controleren.",
        expectedResult: "De stuklijst toont alle benodigde componentartikelen met de juiste aantallen per eenheid eindproduct; de componentvoorraad is voldoende voor de gewenste productieaantallen."
      },
      {
        title: "Productieorder aanmaken",
        instruction: "Ga naar Ordermanagement > Productie > Productieorder > Nieuw, selecteer het samengestelde artikel, voer het te produceren aantal in, stel de gewenste einddatum in en sla de productieorder op.",
        expectedResult: "De productieorder is aangemaakt met status 'Open', het juiste samengestelde artikel en het opgegeven productieboekingsaantal; de componentregels zijn automatisch gegenereerd op basis van de stuklijst."
      },
      {
        title: "Componentbeschikbaarheid controleren",
        instruction: "Open de productieorder in Ordermanagement > Productie > Productieorder en klik op Acties > Samenstelling om de beschikbare voorraad per componentartikelregel te controleren.",
        expectedResult: "Alle componentartikelen hebben een voldoende vrije voorraad voor de gevraagde productieaantallen; eventuele tekorten zijn gemarkeerd in het samenstellingsoverzicht."
      },
      {
        title: "Productiebon aanmaken",
        instruction: "Open de productieorder en klik op Acties > Productiebon aanmaken, controleer het geproduceerde aantal en de componentverbruiken per regel, en sla de productiebon op.",
        expectedResult: "De productiebon is aangemaakt; de componentvoorraden zijn verlaagd met de verbruikte aantallen en de voorraad van het eindproduct is verhoogd met het geproduceerde aantal."
      },
      {
        title: "Productieorder afsluiten",
        instruction: "Open de productieorder in Ordermanagement > Productie > Productieorder en klik op Acties > Afsluiten nadat alle productiebonnen zijn verwerkt.",
        expectedResult: "De productieorder heeft de status 'Afgesloten'; er zijn geen openstaande productieregels meer en de eindproductvoorraad is correct bijgewerkt in het voorraadoverzicht."
      }
    ]
  },
  {
    key: "LOG_LEVERINGEN",
    name: "Leveringen en logistiek",
    category: "ALG",
    description: "Test het leveringsproces inclusief het automatisch genereren van pakbonnen, verzendgereedmelding, transportkoppeling en het afhandelen van een retourlevering.",
    steps: [
      {
        title: "Pakbonnen automatisch genereren",
        instruction: "Ga naar Ordermanagement > Verkoop > Pakbon genereren, stel een selectie in op orderdatum en debiteur, en klik op Genereren om pakbonnen aan te maken voor alle leverbare orderregels.",
        expectedResult: "Pakbonnen zijn automatisch gegenereerd voor alle verkooporderregels die volledig op voorraad zijn; elke pakbon toont de juiste debiteur, artikelen en te leveren aantallen."
      },
      {
        title: "Pakbon afdrukken",
        instruction: "Open een pakbon in Ordermanagement > Verkoop > Pakbon en klik op Acties > Afdrukken om het verzendingsdocument met afleveradres en artikelgegevens te genereren.",
        expectedResult: "Het pakbondocument is gegenereerd met alle leveringsgegevens: debiteur, afleveradres, artikelen, aantallen en de pakbonreferentie."
      },
      {
        title: "Verzending gereedmelden",
        instruction: "Open de pakbon en klik op Acties > Pakbon gereedmelden nadat de goederen zijn verpakt en gereed staan voor verzending.",
        expectedResult: "De pakbonstatus is gewijzigd naar 'Gereed'; de voorraad is afgeboekt en de pakbon is beschikbaar voor facturatie."
      },
      {
        title: "Track-en-trace-code controleren",
        instruction: "Controleer in de gereedgemelde pakbon of het veld Track-en-trace-code is gevuld via de transportkoppeling (bijv. Transsmart) en noteer de zendingscode.",
        expectedResult: "Het track-en-trace-veld op de pakbon toont een geldige code van de transporteur; de klant kan de zending hiermee volgen via de website van de vervoerder."
      },
      {
        title: "Retourlevering registreren",
        instruction: "Ga naar Ordermanagement > Verkoop > Retourorder > Nieuw, koppel de originele pakbon of verkooporder, voer het te retourneren artikel en aantal in, en sla de retourorder op.",
        expectedResult: "De retourorder is aangemaakt met verwijzing naar de originele order; na verwerking is de geretourneerde voorraad ingeboekt op de opgegeven magazijnlocatie."
      }
    ]
  }
];
