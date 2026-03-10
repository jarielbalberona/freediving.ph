package service

import (
	"strings"
)

type feedPresentation struct {
	TypeLabel string
	TypeHint  string
	RankLabel string
	RankHint  string
	Tone      string
}

type modeFrame struct {
	Greeting    string
	Message     string
	SafetyBadge string
}

func presentationFor(mode Mode, itemType ItemType, reasons []string) feedPresentation {
	rankLabel := "Worth a look"
	rankHint := "Highlights from across the community."
	for _, reason := range reasons {
		switch strings.TrimSpace(reason) {
		case "following":
			rankLabel = "From your network"
			rankHint = "Updates from divers you follow."
		case "nearby", "nearby_spot":
			rankLabel = "Happening nearby"
			rankHint = "Local activity and potential dive opportunities."
		case "training_affinity":
			rankLabel = "Training focus"
			rankHint = "Logs and discussions about technique and progress."
		case "spot_reports":
			rankLabel = "Conditions report"
			rankHint = "Recent updates on visibility and site conditions."
		case "buddy_activity":
			rankLabel = "Buddy check"
			rankHint = "Divers looking for partners right now."
		case "event_activity":
			rankLabel = "Upcoming events"
			rankHint = "Active meetups and sessions."
		case "community_heat":
			rankLabel = "Trending"
			rankHint = "Popular conversations in the community."
		case "saved_spot_related":
			rankLabel = "From your saved spots"
			rankHint = "Activity at places you're interested in."
		}
	}

	switch itemType {
	case ItemTypePost:
		return feedPresentation{
			TypeLabel: "Dive update",
			TypeHint:  "Updates from the water.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "social",
		}
	case ItemTypeMediaPost:
		return feedPresentation{
			TypeLabel: "Photo post",
			TypeHint:  "Photos from dives and sessions.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "social",
		}
	case ItemTypeCommunityHot:
		return feedPresentation{
			TypeLabel: "Community thread",
			TypeHint:  "Active community discussions.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "social",
		}
	case ItemTypeDiveSpot:
		return feedPresentation{
			TypeLabel: "Spot briefing",
			TypeHint:  "Site info and conditions.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "conditions",
		}
	case ItemTypeEvent:
		return feedPresentation{
			TypeLabel: "Group session",
			TypeHint:  "Group dives and meetups.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "coordination",
		}
	case ItemTypeBuddySignal:
		return feedPresentation{
			TypeLabel: "Buddy call",
			TypeHint:  "Divers looking for partners.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "coordination",
		}
	default:
		return feedPresentation{
			TypeLabel: "Record highlight",
			TypeHint:  "Notable community milestones.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "milestone",
		}
	}
}

func profileHref(username string) string {
	trimmed := strings.TrimSpace(username)
	if trimmed == "" {
		return ""
	}
	return "/" + strings.ToLower(trimmed)
}

func eventHref(id string) string {
	if strings.TrimSpace(id) == "" {
		return ""
	}
	return "/events/" + strings.TrimSpace(id)
}

func buddyHref(id string) string {
	if strings.TrimSpace(id) == "" {
		return ""
	}
	return "/buddy/" + strings.TrimSpace(id)
}

func chikaHref(id string) string {
	if strings.TrimSpace(id) == "" {
		return ""
	}
	return "/chika/" + strings.TrimSpace(id)
}

func diveSiteHref(slug string) string {
	if strings.TrimSpace(slug) == "" {
		return ""
	}
	return "/explore/sites/" + strings.TrimSpace(slug)
}

func contextForMode(mode Mode, isGuest bool) modeFrame {
	if isGuest {
		return modeFrame{
			Greeting:    "Community Pulse",
			Message:     "Live activity, local updates, and buddy coordination. Sign in for more.",
			SafetyBadge: "Preview",
		}
	}

	switch mode {
	case ModeNearby:
		return modeFrame{
			Greeting:    "Local Activity",
			Message:     "Updates, buddy calls, and reports from your area.",
			SafetyBadge: "Nearby",
		}
	case ModeTraining:
		return modeFrame{
			Greeting:    "Training & Progress",
			Message:     "Focused on technique, session logs, and training discussions.",
			SafetyBadge: "Training",
		}
	case ModeSpotReports:
		return modeFrame{
			Greeting:    "Conditions Reports",
			Message:     "Latest visibility and site updates from the community.",
			SafetyBadge: "Conditions",
		}
	default:
		return modeFrame{
			Greeting:    "Community Feed",
			Message:     "Updates from divers you follow and trending discussions.",
			SafetyBadge: "Network",
		}
	}
}

func quickActionsForMode(mode Mode) []QuickAction {
	switch mode {
	case ModeNearby:
		return []QuickAction{
			{Type: "find_buddy", Label: "Find buddy"},
			{Type: "report_conditions", Label: "Report conditions"},
			{Type: "explore_spots", Label: "Browse spots"},
			{Type: "join_event", Label: "Find events"},
		}
	case ModeTraining:
		return []QuickAction{
			{Type: "log_training", Label: "Log training"},
			{Type: "share_progress", Label: "Share progress"},
			{Type: "find_buddy", Label: "Find buddy"},
			{Type: "join_event", Label: "Find events"},
		}
	case ModeSpotReports:
		return []QuickAction{
			{Type: "report_conditions", Label: "Report conditions"},
			{Type: "explore_spots", Label: "Browse spots"},
			{Type: "find_buddy", Label: "Find buddy"},
			{Type: "join_event", Label: "Find events"},
		}
	default:
		return []QuickAction{
			{Type: "post_update", Label: "Post update"},
			{Type: "find_buddy", Label: "Find buddy"},
			{Type: "open_chika", Label: "Start chika"},
			{Type: "create_session", Label: "Create session"},
		}
	}
}
