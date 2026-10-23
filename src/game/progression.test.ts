import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PROGRESSION,
  addSkillXp,
  purchaseProperty,
  purchaseVehicle
} from './progression';
import { generateDynamicMission } from './missions';

test('addSkillXp awards XP and handles level up thresholds', () => {
  const initial = { ...DEFAULT_PROGRESSION };
  const res = addSkillXp(initial, 'driving', 150);

  assert.equal(res.leveledUp, true, 'Skill should level up when XP exceeds maxXp');
  assert.equal(res.progression.skills.driving.level, 2);
  assert.equal(res.progression.skills.driving.xp, 50);
});

test('purchaseProperty deducts funds and grants ownership', () => {
  const initial = {
    ...DEFAULT_PROGRESSION,
    cash: 50000
  };

  const res = purchaseProperty(initial, 'ocean_view');
  assert.equal(res.success, true);
  assert.equal(res.progression.cash, 35000);
  const prop = res.progression.properties.find(p => p.id === 'ocean_view');
  assert.equal(prop?.owned, true);

  // Attempting to buy again fails
  const secondBuy = purchaseProperty(res.progression, 'ocean_view');
  assert.equal(secondBuy.success, false);
});

test('purchaseProperty rejects when funds are insufficient', () => {
  const initial = {
    ...DEFAULT_PROGRESSION,
    cash: 2000
  };

  const res = purchaseProperty(initial, 'malibu_club');
  assert.equal(res.success, false);
  assert.equal(res.progression.cash, 2000);
});

test('purchaseVehicle adds car to owned fleet', () => {
  const initial = {
    ...DEFAULT_PROGRESSION,
    cash: 60000
  };

  const res = purchaseVehicle(initial, 'cheetah_gt');
  assert.equal(res.success, true);
  const car = res.progression.garage.find(v => v.id === 'cheetah_gt');
  assert.equal(car?.owned, true);
});

test('generateDynamicMission produces playable mission with rewards and target', () => {
  const mission = generateDynamicMission(2, 0, 70);
  assert.ok(mission.id.startsWith('m_'));
  assert.ok(mission.title.length > 5);
  assert.ok(mission.rewardCash >= 5000);
  assert.ok(mission.timeLimit > 0);
  assert.ok(mission.targetPos.x !== undefined);
  assert.ok(mission.targetPos.z !== undefined);
});
